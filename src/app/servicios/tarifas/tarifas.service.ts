import { inject, Injectable } from "@angular/core";
import { StorageService } from "../storage/storage.service";
import { TarifaPersonalizadaCliente } from "src/app/interfaces/tarifa-personalizada-cliente";
import { toISODateString } from "../fechas/date-range.service";
import { TarifaForm } from "src/app/raiz/clientes/cliente-tarifa-personalizada/cliente-tarifa-personalizada.component";
import {
  collection,
  doc,
  DocumentData,
  Firestore,
  getDocs,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "@angular/fire/firestore";
import { ConId } from "src/app/interfaces/conId";
import { Cliente } from "src/app/interfaces/cliente";
import {
  Resultado,
  ResultadoConObjeto,
} from "../database/db-firestore.service";

export interface ErrorTarifa {
  mensaje: string;
  seccionIndex?: number;
  categoriaIndex?: number;
  campo?: "kmDistancia";
}

@Injectable({
  providedIn: "root",
})
export class TarifasService {
  private firestore = inject(Firestore);
  basePath: string = `/Vantruck/datos`;

  constructor(private storageService: StorageService) {}

  private crearObjetoTarifa(
    idCliente: number,
    form: any,
    modo: "crear" | "editar",
    datosOriginales?: TarifaPersonalizadaCliente,
    usuario?: string,
  ): TarifaPersonalizadaCliente {
    const fecha = new Date();
    const fechaStr = toISODateString(fecha);

    if (modo === "crear") {
      return {
        idTarifa: Number(`${Date.now()}${Math.floor(Math.random() * 100)}`),

        fecha: fechaStr,

        idCliente: idCliente,

        tipo: {
          general: false,
          especial: false,
          eventual: false,
          personalizada: true,
        },

        secciones: form.secciones,

        adKmboolean: form.adKmboolean,

        adicionales: form.adicionales,
      };
    }

    // MODO EDITAR
    return {
      ...datosOriginales!,

      secciones: form.secciones,

      adKmboolean: form.adKmboolean,

      adicionales: form.adicionales,

      fechaActualizacion: fechaStr,

      actualizadoPor: usuario,
    };
  }

  async altaTarifaPersonalizada(
    cliente: ConId<Cliente>,
    form: TarifaForm,
  ): Promise<ResultadoConObjeto> {
    const error = this.validarTarifa(form);

    if (error) {
      throw new Error(error.mensaje);
    }

    const tarifaNueva = this.crearObjetoTarifa(
      cliente.idCliente,
      form,
      "crear",
    );
    console.log("tarifaNueva: ", tarifaNueva);

    const resultado: Resultado = await this.guardarTarifaPersonalizada(
      tarifaNueva,
      cliente,
    );
    const respuesta: ResultadoConObjeto = {
      exito: resultado.exito,
      mensaje: resultado.mensaje,
      objeto: tarifaNueva,
    };

    return respuesta;
  }

  editarTarifaPersonalizada(tarifaEditada: TarifaPersonalizadaCliente) {
    const tarifas = this.storageService.loadInfo("tarifasPersCliente") || [];

    const index = tarifas.findIndex(
      (t: TarifaPersonalizadaCliente) => t.idTarifa === tarifaEditada.idTarifa,
    );

    if (index !== -1) {
      tarifas[index] = tarifaEditada;
    }

    /* REEMPLAZAR */
    //this.storageService.saveInfo("tarifasPersCliente", tarifas);
  }

  aumentarTarifaPersonalizada(
    tarifaActual: TarifaPersonalizadaCliente,
    form: any,
  ) {
    const tarifas = this.storageService.loadInfo("tarifasPersCliente") || [];

    const tarifaNueva = this.crearObjetoTarifa(
      tarifaActual.idCliente,
      form,
      "crear",
    );

    // mover la vieja al historial
    this.moverAHistorial(tarifaActual);

    // sacar tarifa vieja
    const nuevasTarifas = tarifas.filter(
      (t: TarifaPersonalizadaCliente) => t.idTarifa !== tarifaActual.idTarifa,
    );

    nuevasTarifas.push(tarifaNueva);

    /* REEMPLAZAR */
    /* this.storageService.saveInfo(
    "tarifasPersCliente",
    nuevasTarifas
  ); */

    this.actualizarReferenciaCliente(
      tarifaActual.idCliente,
      tarifaNueva.idTarifa,
    );

    return tarifaNueva;
  }

  duplicarTarifaPersonalizada(tarifa: TarifaPersonalizadaCliente) {
    const copia = structuredClone(tarifa);

    copia.idTarifa = Date.now();
    copia.fecha = toISODateString(new Date());

    return copia;
  }

  private moverAHistorial(tarifa: TarifaPersonalizadaCliente) {
    const historial =
      this.storageService.loadInfo("tarifasPersHistorial") || [];

    historial.push(tarifa);

    /* REEMPLAZAR */
    /* this.storageService.saveInfo(
    "tarifasPersHistorial",
    historial
  ); */
  }

  private actualizarReferenciaCliente(
    idCliente: number,
    idTarifaNueva: number,
  ) {
    const clientes = this.storageService.loadInfo("clientes");

    const cliente = clientes.find((c: any) => c.idCliente === idCliente);

    if (cliente) {
      cliente.idTarifa = idTarifaNueva;
    }

    /* REEMPLAZAR */
    //this.storageService.saveInfo("clientes", clientes);
  }

  validarTarifa(form: TarifaForm): ErrorTarifa | null {
    if (!form.secciones.length) {
      return { mensaje: "Debe existir al menos una sección" };
    }

    const nombresSecciones = new Set<string>();

    for (let i = 0; i < form.secciones.length; i++) {
      const seccion = form.secciones[i];
      const nombreSeccion = seccion.descripcion?.trim();

      if (!nombreSeccion) {
        return {
          mensaje: "Todas las secciones deben tener nombre",
          seccionIndex: i,
        };
      }

      const nombreSeccionNormalizado = nombreSeccion.toLowerCase();

      // 🚨 Sección duplicada
      if (nombresSecciones.has(nombreSeccionNormalizado)) {
        return {
          mensaje: `La sección "${nombreSeccion}" está repetida`,
          seccionIndex: i,
        };
      }

      nombresSecciones.add(nombreSeccionNormalizado);

      if (!seccion.categorias?.length) {
        return {
          mensaje: `La sección ${nombreSeccion} no tiene categorías`,
          seccionIndex: i,
        };
      }

      const nombresCategorias = new Set<string>();

      for (let j = 0; j < seccion.categorias.length; j++) {
        const categoria = seccion.categorias[j];
        const nombreCategoria = categoria.nombre?.trim();

        if (!nombreCategoria) {
          return {
            mensaje: "Todas las categorías deben tener nombre",
            seccionIndex: i,
            categoriaIndex: j,
          };
        }

        const nombreCategoriaNormalizado = nombreCategoria.toLowerCase();

        // 🚨 Categoría duplicada dentro de la misma sección
        if (nombresCategorias.has(nombreCategoriaNormalizado)) {
          return {
            mensaje: `La categoría "${nombreCategoria}" está repetida en la sección "${nombreSeccion}"`,
            seccionIndex: i,
            categoriaIndex: j,
          };
        }

        nombresCategorias.add(nombreCategoriaNormalizado);

        if (categoria.aCobrar < 0 || categoria.aPagar < 0) {
          return {
            mensaje: "Los valores no pueden ser negativos",
            seccionIndex: i,
            categoriaIndex: j,
          };
        }
      }
    }

    if (form.adKmboolean) {
      if (form.adicionales.KmDistancia.primerSector <= 0) {
        return {
          mensaje: "El valor distancia del primer sector debe ser mayor a 0",
          campo: "kmDistancia",
        };
      }

      if (form.adicionales.KmDistancia.sectoresSiguientes <= 0) {
        return {
          mensaje:
            "El valor distancia de los intervalos de sectores debe ser mayor a 0",
          campo: "kmDistancia",
        };
      }
    }

    return null;
  }

  async guardarTarifaPersonalizada(
    tarifa: TarifaPersonalizadaCliente,
    cliente: ConId<Cliente>,
  ): Promise<Resultado> {
    try {
      let tPersonalizadas: ConId<TarifaPersonalizadaCliente>[] =
        this.storageService.loadInfo("tarifasPersCliente");
      let tarifaVieja = tPersonalizadas.find(
        (t) => t.idCliente === cliente.idCliente,
      );

      const db = this.firestore;

      await runTransaction(db, async (transaction) => {
        // 1️⃣ Verificar que no exista una tarifa con el mismo idTarifa
        const qTarifa = query(
          collection(db, `${this.basePath}/tarifasPersCliente`),
          where("idTarifa", "==", tarifa.idTarifa),
        );

        const snapTarifa = await getDocs(qTarifa);

        if (!snapTarifa.empty) {
          throw new Error("Ya existe una tarifa con ese idTarifa");
        }

        // 2️⃣ Verificar si el cliente ya tiene tarifa personalizada

        if (tarifaVieja) {
          // referencia a la tarifa vigente en firestore
          const refTarifaVieja = doc(
            db,
            `${this.basePath}/tarifasPersCliente`,
            tarifaVieja.id,
          );

          // referencia para el historial
          const refHistorial = doc(
            collection(db, `${this.basePath}/historialTarifasPersCliente`),
          );

          let { id, ...tarifaSinId } = tarifaVieja;

          // mover al historial
          transaction.set(refHistorial, tarifaSinId);

          // eliminar tarifa vigente
          transaction.delete(refTarifaVieja);
        }

        // 3️⃣ Guardar nueva tarifa
        const refNuevaTarifa = doc(
          collection(db, `${this.basePath}/tarifasPersCliente`),
        );

        transaction.set(refNuevaTarifa, tarifa);

        // 4️⃣ Actualizar referencia en cliente
        const refCliente = doc(db, `${this.basePath}/clientes`, cliente.id);

        transaction.update(refCliente, {
          idTarifa: tarifa.idTarifa,
          tarifaAsignada: true,
        });
      });

      return {
        exito: true,
        mensaje: "Tarifa personalizada creada correctamente",
      };
    } catch (error: any) {
      return {
        exito: false,
        mensaje: error.message || "Error al crear la tarifa",
      };
    }
  }

  async editarTarifaCliente(
    idTarifa: number,
    idCliente: number,
    form: any,
    usuario: string,
  ): Promise<ResultadoConObjeto> {
    try {
      const ref = collection(
        this.firestore,
        `${this.basePath}/tarifasPersCliente`,
      );

      const docSnap = await this.obtenerDocPorIdTarifa(idTarifa);

      if (!docSnap) {
        return {
          exito: false,
          mensaje: "No se encontró la tarifa",
          objeto: null,
        };
      }

      const datosOriginales = docSnap.data() as TarifaPersonalizadaCliente;

      const tarifaActualizada = this.crearObjetoTarifa(
        idCliente,
        form,
        "editar",
        datosOriginales,
        usuario,
      );

      await setDoc(docSnap.ref, tarifaActualizada, { merge: true });

      return {
        exito: true,
        mensaje: "Tarifa actualizada correctamente",
        objeto: tarifaActualizada,
      };
    } catch (error) {
      console.error("Error al editar tarifa", error);

      return {
        exito: false,
        mensaje: "Error al actualizar la tarifa",
        objeto: error,
      };
    }
  }

  private async obtenerDocPorIdTarifa(
    idTarifa: number,
  ): Promise<QueryDocumentSnapshot<DocumentData> | null> {
    const ref = collection(
      this.firestore,
      `${this.basePath}/tarifasPersCliente`,
    );

    const q = query(ref, where("idTarifa", "==", idTarifa));

    const snap = await getDocs(q);

    if (snap.empty) return null;

    return snap.docs[0];
  }

  async clienteTieneTarifa(idCliente: number): Promise<boolean> {
    const ref = collection(
      this.firestore,
      `${this.basePath}/tarifasPersCliente`,
    );

    const q = query(ref, where("idCliente", "==", idCliente));

    const snap = await getDocs(q);

    return !snap.empty;
  }
}
