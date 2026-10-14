import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import {
  OrigenFechaNacimiento, errorFechaNacimiento, normalizarFechaNacimiento,
} from 'src/app/shared/utils/fecha-nacimiento.util';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';

/** 'convertir': se reescribe como 'YYYY-MM-DD'. 'ok': ya está bien.
 *  'revisar': no se puede convertir o queda fuera de rango; no se toca (se
 *  corrige editando el chofer, que ahora exige una fecha válida). */
export type AccionFechaNac = 'convertir' | 'ok' | 'revisar';

export interface RenglonFechaNac {
  coleccion: 'choferes' | 'objetosEliminados';
  id: string;
  nombre: string;
  origen: OrigenFechaNacimiento;
  /** Lo guardado, para leer: el texto, o el instante del Timestamp/mapa. */
  actual: string;
  /** 'DD/MM/AAAA' que queda, o '—'. */
  propuesta: string;
  accion: AccionFechaNac;
  motivo: string;
}

export interface SimulacionFechaNac {
  proyecto: string;
  renglones: RenglonFechaNac[];
  convertir: number;
  ok: number;
  revisar: number;
}

interface Preparacion {
  simulacion: SimulacionFechaNac;
  escrituras: EscrituraBatch[];
}

const PREFIJO_PAPELERA = 'choferes__';

/**
 * Herramienta de /migracion (FI1c): normaliza `datosPersonales.fechaNac` de
 * los choferes a 'YYYY-MM-DD'. Recorre `choferes` y los choferes archivados
 * en la papelera (`objetosEliminados`, id `choferes__<id>`), para que una
 * restauración no traiga de vuelta el formato viejo.
 *
 * Seguridad: rol dev; Ejecutar pide escribir el id del proyecto. Sirve en
 * cualquier proyecto (en la migración de Vantruck: simular primero). Escribe
 * solo la fecha (update con dot-notation), sin log (como los Recálculos).
 */
@Injectable({ providedIn: 'root' })
export class NormalizacionFechaNacService {

  private db = inject(DbFirestoreService);
  private usuarioSesion = inject(UsuarioSesionService);

  static readonly PROYECTO_DEMO = 'demoapplog';

  get proyecto(): string {
    return environment.firebase.projectId;
  }

  esEntornoDemo(): boolean {
    return this.proyecto === NormalizacionFechaNacService.PROYECTO_DEMO;
  }

  /** No escribe nada. */
  async simular(): Promise<SimulacionFechaNac> {
    this.verificarAcceso();
    return (await this.preparar()).simulacion;
  }

  /** Vuelve a leer todo y escribe solo los renglones 'convertir'. */
  async ejecutar(confirmacion: string): Promise<number> {
    this.verificarAcceso();
    if ((confirmacion ?? '').trim() !== this.proyecto) {
      throw new Error(`Confirmación incorrecta: escribí el id del proyecto (${this.proyecto}).`);
    }
    const { escrituras } = await this.preparar();
    if (escrituras.length > 0) {
      await this.db.commitBatch(escrituras);
    }
    return escrituras.length;
  }

  private async preparar(): Promise<Preparacion> {
    const choferes = await this.db.obtenerTodosConId<any>('choferes');
    // objetosEliminados se lee entero: en el modelo nuevo es chica (empezó de
    // cero con el frente Papelera). Si creciera, consultar por rango de id.
    const archivados = (await this.db.obtenerTodosConId<any>('objetosEliminados'))
      .filter(o => o.id.startsWith(PREFIJO_PAPELERA));

    const renglones: RenglonFechaNac[] = [];
    const escrituras: EscrituraBatch[] = [];
    for (const { id, data } of choferes) {
      this.evaluar('choferes', id, data, renglones, escrituras);
    }
    for (const { id, data } of archivados) {
      this.evaluar('objetosEliminados', id, data, renglones, escrituras);
    }

    const orden: Record<AccionFechaNac, number> = { revisar: 0, convertir: 1, ok: 2 };
    renglones.sort((a, b) => orden[a.accion] - orden[b.accion] || a.nombre.localeCompare(b.nombre));
    const cuenta = (a: AccionFechaNac) => renglones.filter(r => r.accion === a).length;
    return {
      simulacion: {
        proyecto: this.proyecto,
        renglones,
        convertir: cuenta('convertir'),
        ok: cuenta('ok'),
        revisar: cuenta('revisar'),
      },
      escrituras,
    };
  }

  private evaluar(
    coleccion: RenglonFechaNac['coleccion'],
    id: string,
    data: any,
    renglones: RenglonFechaNac[],
    escrituras: EscrituraBatch[],
  ): void {
    const dp = data?.datosPersonales ?? {};
    const valor = dp.fechaNac;
    const { fecha, origen } = normalizarFechaNacimiento(valor);
    const error = fecha ? errorFechaNacimiento(fecha) : null;
    const base = {
      coleccion,
      id,
      nombre: `${dp.apellido ?? ''} ${dp.nombre ?? ''}`.trim() || id,
      origen,
      actual: this.describir(valor),
      propuesta: fecha ? fechaLegible(fecha) : '—',
    };

    if (!fecha) {
      renglones.push({ ...base, accion: 'revisar', motivo: origen === 'vacio' ? 'Sin fecha' : 'No se puede interpretar' });
      return;
    }
    if (error) {
      renglones.push({ ...base, accion: 'revisar', motivo: error });
      return;
    }
    if (origen === 'texto' && valor === fecha) {
      renglones.push({ ...base, accion: 'ok', motivo: '' });
      return;
    }
    renglones.push({ ...base, accion: 'convertir', motivo: `Guardada como ${origen}` });
    escrituras.push({ coleccion, id, data: { 'datosPersonales.fechaNac': fecha }, modo: 'actualizar' });
  }

  private describir(valor: unknown): string {
    if (valor === null || valor === undefined) return '(vacío)';
    if (typeof valor === 'string') return `"${valor}"`;
    const v = valor as { toDate?: () => Date; seconds?: number };
    try {
      if (typeof v.toDate === 'function') return `Timestamp ${v.toDate().toISOString()}`;
      if (typeof v.seconds === 'number') return `{seconds} ${new Date(v.seconds * 1000).toISOString()}`;
    } catch {
      // fecha fuera de rango para Date: cae al JSON
    }
    return JSON.stringify(valor);
  }

  private verificarAcceso(): void {
    if (this.usuarioSesion.getRol() !== 'dev') {
      throw new Error('Normalización bloqueada: requiere rol dev.');
    }
  }
}
