import { inject, Injectable } from "@angular/core";
import {
  Firestore,
  collection,
  collectionData,
  doc,
  orderBy,
  query,
  where,
  writeBatch,
} from "@angular/fire/firestore";
import { ConId } from "src/app/interfaces/conId";
import { Operacion } from "src/app/interfaces/operacion";
import {
  ResumenOpBase,
  ResumenOpGeneralMensual,
} from "src/app/interfaces/resumen-op-base";
import { ResumenBuilderService } from "./resumen-builder.service";
import { Resultado } from "../../database/db-firestore.service";
import { Observable } from "rxjs";
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";

type TipoEntidad = "cliente" | "chofer" | "proveedor";
type Tipo = "general" | "entidad";

export interface KeyResumen {
  tipo: Tipo;
  tipoEntidad?: TipoEntidad
  entidadId?: number;
  anio: number;
  mes: number;
}

@Injectable({
  providedIn: "root",
})
export class ReportesOpService {
  private errores: string[] = [];

  private firestore = inject(Firestore);
  basePath: string = "/Vantruck/datos";

  constructor(private resumenBuilder: ResumenBuilderService) {}

  // =========================
  // 🔹 MÉTODO PRINCIPAL
  // =========================
  async reconstruirResumenes(ops: ConId<Operacion>[]): Promise<Resultado> {
    this.errores = [];

    try {
      const map = this.generarResumenes(ops);
      console.log(map);

      await this.guardarResumenes(map);

      const mensajeBase = `Resumenes generados (${map.size} documentos)`;

      if (this.errores.length > 0) {
        return {
          exito: false,
          mensaje: `${mensajeBase} con ${this.errores.length} errores`,
        };
      }

      return {
        exito: true,
        mensaje: mensajeBase,
      };
    } catch (error: any) {
      console.error("Error crítico reconstruyendo resúmenes:", error);

      return {
        exito: false,
        mensaje: `Error crítico: ${error?.message ?? error}`,
      };
    }
  }

  // =========================
  // 🔹 GENERAR MAPA
  // =========================
  private generarResumenes(
    ops: ConId<Operacion>[],
  ): Map<string, ResumenOpBase> {
    const map = new Map<string, ResumenOpBase>();

    for (const op of ops) {
      try {
        if (op.estado.abierta) continue;

        const { anio, mes } = this.parseFechaLocal(op.fecha);

        // CLIENTE
        this.procesarOperacion(
          map,
          {
            tipo:'entidad',
            tipoEntidad: "cliente",
            entidadId: op.cliente.idCliente,
            anio,
            mes,
          },
          op,
        );

        // CHOFER / PROVEEDOR
        if (op.chofer.idProveedor && op.chofer.idProveedor !== 0) {
          this.procesarOperacion(
            map,
            {
              tipo:'entidad',
              tipoEntidad: "proveedor",
              entidadId: op.chofer.idProveedor,
              anio,
              mes,
            },
            op,
          );
        } else {
          this.procesarOperacion(
            map,
            {
              tipo:'entidad',
              tipoEntidad: "chofer",
              entidadId: op.chofer.idChofer,
              anio,
              mes,
            },
            op,
          );
        }

        // GENERAL
        this.procesarOperacion(
          map,
          {
            tipo: 'general',
            anio,
            mes,
          },
          op,
        );
      } catch (error: any) {
        const msg = `Op ${op.idOperacion}: ${error?.message ?? error}`;
        console.error(msg);

        this.errores.push(msg);
      }
    }

    return map;
  }

  // =========================
  // 🔹 PROCESAR UNA OP
  // =========================
  private procesarOperacion(
    map: Map<string, ResumenOpBase>,
    keyData: KeyResumen,
    op: Operacion,
  ): void {
    try {
      const key = this.buildKey(keyData);

      if (!map.has(key)) {
        map.set(key, this.resumenBuilder.crearResumenBase(keyData));
      }

      const resumen = map.get(key)!;

      this.aplicarOperacion(resumen, op);
    } catch (error: any) {
      const msg = `Op ${op.idOperacion} (procesar ${keyData.tipo}): ${error?.message ?? error}`;
      console.error(msg);

      this.errores.push(msg);
    }
  }

  // =========================
  // 🔹 BUILD KEY
  // =========================
  private buildKey(k: KeyResumen): string {

    if (k.tipo === 'general') {
      return `general_${k.anio}_${k.mes}`;
    }

    return `${k.tipoEntidad}_${k.entidadId}_${k.anio}_${k.mes}`;
  }

  // =========================
  // 🔹 APLICAR OPERACIÓN
  // =========================
  private aplicarOperacion(res: ResumenOpBase, op: Operacion): void {
    try {
      res.cantidadOps++;
      res.kmRecorridos += op.km;

      if (op.acompaniante) {
        res.acompanianteOps++;
        res.acompanianteCantidadTotal += op.acompanienteCant ?? 1;
      }

      const tipo = this.getTipoTarifa(op);
      res.tarifaTipo[tipo]++;

      // cliente
      const c = op.valores?.cliente;
      if (!c) throw new Error("Valores cliente inexistentes");

      res.cliente.acompValor += c.acompValor;
      res.cliente.kmAdicional += c.kmAdicional;
      res.cliente.tarifaBase += c.tarifaBase;
      res.cliente.adExtraValor += c.adExtraValor ?? 0;

      // chofer
      const ch = op.valores?.chofer;
      if (!ch) throw new Error("Valores chofer inexistentes");

      res.chofer.acompValor += ch.acompValor;
      res.chofer.kmAdicional += ch.kmAdicional;
      res.chofer.tarifaBase += ch.tarifaBase;
      res.chofer.adExtraValor += ch.adExtraValor ?? 0;

      // totales
      res.cliente.total += c.aCobrar;

      res.chofer.total += ch.aPagar;

      res.ganancia = res.cliente.total - res.chofer.total;
    } catch (error: any) {
      const msg = `Op ${op.idOperacion} (aplicar): ${error?.message ?? error}`;
      console.error(msg);

      this.errores.push(msg);
    }
  }

  // =========================
  // 🔹 GUARDAR (BATCH)
  // =========================
  private async guardarResumenes(
    map: Map<string, ResumenOpBase>,
  ): Promise<void> {
    const entries = Array.from(map.entries());
    const chunkSize = 400;

    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const batch = writeBatch(this.firestore);

      for (const [id, data] of chunk) {
        const ref = doc(
          this.firestore,
          `${this.basePath}/resumenOpMensual/${id}`,
        );

        batch.set(
          ref,
          {
            ...data,
            updatedAt: Date.now(),
          },
          { merge: true },
        );
      }

      await batch.commit();
    }
  }

  private getTipoTarifa(
    op: Operacion,
  ): "general" | "especial" | "eventual" | "personalizada" {
    const t = op.tarifaTipo;

    if (t.general) return "general";
    if (t.especial) return "especial";
    if (t.eventual) return "eventual";
    if (t.personalizada) return "personalizada";

    throw new Error("Tipo de tarifa inválido");
  }

  getErrores(): string[] {
    return this.errores;
  }

  private parseFechaLocal(fechaStr: string): { anio: number; mes: number } {
    const [anioStr, mesStr] = fechaStr.split("-");

    const anio = Number(anioStr);
    const mes = Number(mesStr);

    if (!anio || !mes) {
      throw new Error(`Fecha inválida: ${fechaStr}`);
    }

    return { anio, mes };
  }

  getResumenGeneral(
    periodo: PeriodoFiltro,
  ): Observable<ResumenOpGeneralMensual[]> {
    const desde = periodo.desde.anio * 100 + periodo.desde.mes;
    const hasta = periodo.hasta.anio * 100 + periodo.hasta.mes;

    console.log("desde: ", desde, "hasta: ", hasta);

    const ref = collection(this.firestore, `${this.basePath}/resumenOpMensual`);

    const q = query(
      ref,
      where("tipo", "==", "general"),
      where("periodo", ">=", desde),
      where("periodo", "<=", hasta),
      orderBy("anio", "desc"),
      orderBy("mes", "desc"),
    );

    return collectionData(q) as Observable<ResumenOpGeneralMensual[]>;
  }

  getResumen(
    periodo: PeriodoFiltro,
    tipo: "general" | "entidad",
    entidadId?: number,
    tipoEntidad?: 'cliente' | 'chofer' | 'proveedor',
  ): Observable<ResumenOpBase[]> {
    const desde = periodo.desde.anio * 100 + periodo.desde.mes;
    const hasta = periodo.hasta.anio * 100 + periodo.hasta.mes;

    const ref = collection(this.firestore, `${this.basePath}/resumenOpMensual`);

    const condiciones: any[] = [
      where("periodo", ">=", desde),
      where("periodo", "<=", hasta),
      orderBy("anio", "desc"),
      orderBy("mes", "desc"),
    ];

    if (tipo === "general") {
      condiciones.push(where("tipo", "==", "general"));
    }

    if (tipo === 'entidad' && entidadId !== undefined) {
      condiciones.push(where('tipo', '==', tipo));
      condiciones.push(where('entidadId', '==', entidadId));
      condiciones.push(where('tipoEntidad', '==', tipoEntidad));
    }

    const q = query(ref, ...condiciones);

    return collectionData(q) as Observable<ResumenOpBase[]>;
  }
}
