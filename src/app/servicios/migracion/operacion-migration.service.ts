import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, writeBatch, deleteField } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';
import { AdicionalExtraOp, armarAdExtra } from 'src/app/interfaces/operacion';
import { LimpiezaDemoService } from 'src/app/servicios/desarrollo/limpieza-demo.service';
import { igualesPorContenido } from 'src/app/shared/utils/igualdad.util';

/** Plan de limpieza de UNA operación (TC-L). `adExtra` undefined = el campo
 *  no se toca (la op ya lo tiene); null o un objeto = se escribe. `borrar`:
 *  rutas (con punto) de campos muertos presentes en el documento. */
export interface PlanLimpiezaOp {
  id: string;
  numeroOperacion: number | null;
  adExtra?: AdicionalExtraOp | null;
  borrar: string[];
}

/** Op que ya tenía `adExtra` (escrito por el código nuevo) y además campos
 *  viejos de adicional con OTRO contenido: se conserva `adExtra` y se borran
 *  los viejos; se informa para revisar a mano. */
export interface ConflictoLimpiezaOp {
  id: string;
  numeroOperacion: number | null;
  adExtraActual: AdicionalExtraOp | null;
  adExtraViejo: AdicionalExtraOp | null;
}

export interface ResultadoAuditoriaLimpiezaOps {
  leidas: number;
  aLimpiar: PlanLimpiezaOp[];
  conAdicionalTraducido: number;
  conflictos: ConflictoLimpiezaOp[];
}

@Injectable({ providedIn: 'root' })
export class OperacionMigrationService {

  constructor(private firestore: Firestore) {}

  /** Normaliza el campo `documentacion` de operaciones viejas: antes de este frente
   *  (Cowork, adjuntos reales de Operaciones), ese campo era un input de texto libre —
   *  en la práctica siempre '' en los datos reales (confirmado por nico, ninguna op
   *  vieja tiene contenido ahí). El modelo nuevo espera DocumentoOperacion[].
   *  Transformación puramente mecánica (sin criterio humano, a diferencia de la
   *  migración de Tarifas): cualquier documento cuyo campo no sea ya un array recibe
   *  []. Idempotente — correrlo de nuevo sobre ops ya migradas no hace nada. */
  async normalizarDocumentacion(): Promise<void> {
    console.log('--- Inicio normalización documentacion: operaciones ---');
    const colRef = collection(this.firestore, '/Vantruck/datos/operaciones');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      console.warn('La colección operaciones está vacía.');
      return;
    }

    let actualizadas = 0;
    for (const documento of snapshot.docs) {
      const datos = documento.data() as any;
      if (!Array.isArray(datos['documentacion'])) {
        await updateDoc(doc(colRef, documento.id), { documentacion: [] });
        actualizadas++;
      }
    }

    console.log(`--- Normalización completada: ${actualizadas} operación(es) actualizadas, ${snapshot.size - actualizadas} ya estaban en formato correcto ---`);
  }

  // ── TC-L: limpieza de campos viejos de tarifas en operaciones (SOLO demo) ──

  /** Campos muertos tras TC6/TC8/TC9 (rutas con punto, aptas para update). */
  private static readonly CAMPOS_MUERTOS_OP = [
    'tarifaTipo',
    'datosTarifaPersonalizada',
    'adExtraConcepto',
    'valores.cliente.adExtraValor',
    'valores.chofer.adExtraValor',
    'valores',   // TC10: el espejo legacy completo
  ];

  private verificarDemo(): void {
    if (environment.firebase.projectId !== LimpiezaDemoService.PROYECTO_DEMO) {
      throw new Error(`Limpieza de campos bloqueada: el proyecto es '${environment.firebase.projectId}', no demo.`);
    }
  }

  /** Solo lectura. Por cada operación:
   *  - si NO tiene `adExtra`: lo traduce de los campos viejos (adExtraConcepto
   *    + valores.cliente/chofer.adExtraValor) con armarAdExtra (todo vacío →
   *    null);
   *  - si YA tiene `adExtra` (escrito por el código nuevo): lo conserva; si
   *    los campos viejos dicen otra cosa, lo informa como conflicto;
   *  - lista los campos muertos presentes para borrarlos.
   *  Idempotente: después de aplicar, una segunda auditoría da 0. */
  async auditarLimpiezaCamposTarifas(): Promise<ResultadoAuditoriaLimpiezaOps> {
    this.verificarDemo();
    const snap = await getDocs(collection(this.firestore, '/Vantruck/datos/operaciones'));
    const aLimpiar: PlanLimpiezaOp[] = [];
    const conflictos: ConflictoLimpiezaOp[] = [];
    let conAdicionalTraducido = 0;

    for (const d of snap.docs) {
      const o = d.data() as any;
      const numeroOperacion = o.numeroOperacion ?? null;

      const borrar = OperacionMigrationService.CAMPOS_MUERTOS_OP.filter(ruta => {
        const partes = ruta.split('.');
        let actual: any = o;
        for (let i = 0; i < partes.length - 1; i++) actual = actual?.[partes[i]];
        return actual != null && typeof actual === 'object' && partes[partes.length - 1] in actual;
      });

      const viejo = armarAdExtra(o.adExtraConcepto, o.valores?.cliente?.adExtraValor, o.valores?.chofer?.adExtraValor);
      let adExtra: AdicionalExtraOp | null | undefined = undefined;
      if (!('adExtra' in o)) {
        adExtra = viejo;
        if (viejo) conAdicionalTraducido++;
      } else if (viejo && !igualesPorContenido(viejo, o.adExtra)) {
        conflictos.push({ id: d.id, numeroOperacion, adExtraActual: o.adExtra ?? null, adExtraViejo: viejo });
      }

      if (borrar.length > 0 || adExtra !== undefined) {
        aLimpiar.push({ id: d.id, numeroOperacion, adExtra, borrar });
      }
    }

    return { leidas: snap.size, aLimpiar, conAdicionalTraducido, conflictos };
  }

  /** Aplica el plan de auditarLimpiezaCamposTarifas: por op, un update con
   *  deleteField() en cada campo muerto + `adExtra` si corresponde. Batches
   *  de 400. No toca valoresNuevos ni ningún otro campo (los resúmenes no
   *  cambian). Devuelve la cantidad de operaciones actualizadas. */
  async aplicarLimpiezaCamposTarifas(plan: PlanLimpiezaOp[]): Promise<number> {
    this.verificarDemo();
    const colRef = collection(this.firestore, '/Vantruck/datos/operaciones');
    let actualizadas = 0;
    for (let i = 0; i < plan.length; i += 400) {
      const lote = plan.slice(i, i + 400);
      const batch = writeBatch(this.firestore);
      for (const p of lote) {
        const cambios: Record<string, any> = {};
        // Si se borra un mapa entero ('valores'), sus subrutas sobran (un
        // update con rutas solapadas falla).
        const rutas = p.borrar.filter(r => !p.borrar.some(padre => padre !== r && r.startsWith(padre + '.')));
        for (const ruta of rutas) cambios[ruta] = deleteField();
        if (p.adExtra !== undefined) cambios['adExtra'] = p.adExtra;
        batch.update(doc(colRef, p.id), cambios);
      }
      await batch.commit();
      actualizadas += lote.length;
    }
    return actualizadas;
  }
}
