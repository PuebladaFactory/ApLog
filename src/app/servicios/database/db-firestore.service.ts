import { Injectable } from "@angular/core";
/* import { AngularFirestore } from '@angular/fire/compat/firestore'; */

import {
  addDoc,
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  docData,
  DocumentData,
  DocumentReference,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "@angular/fire/firestore";
import { firstValueFrom, from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ConId, ConIdType } from "src/app/interfaces/conId";

import { Operacion } from "src/app/interfaces/operacion";
import Swal from "sweetalert2";
import { Firestore } from "@angular/fire/firestore";
import { inject } from "@angular/core";
import { TableroDiario } from "src/app/raiz/operaciones/tablero-diario/tablero-diario.component";
import { InformeOp } from "src/app/interfaces/informe-op";
import { InformeLiq, ValoresFinancieros } from "src/app/interfaces/informe-liq";
import { NumeradorService } from "../numerador/numerador.service";
import { InformeVenta } from "src/app/interfaces/informe-venta";

import { MovimientoFinanciero } from "src/app/interfaces/movimiento-financiero";
import {
  ResumenOpCalculatorService,
  UpdateResumen,
} from "../reportes/reportes-op/resumen-op-calculator.service";
import { KeyResumen } from "../reportes/reportes-op/reportes-op.service";

export interface Resultado {
  exito: boolean;
  mensaje: string;
}

export interface ResultadoConObjeto {
  exito: boolean;
  mensaje: string;
  objeto: any;
}

export type ModoEscritura = 'crear' | 'reemplazar';

export interface EscrituraBatch {
  coleccion: string;
  id: string;
  data: any;
  modo: ModoEscritura;
}

export interface ResultadoEliminacion {
  success: boolean;
  mensaje: string;
  faltantes: {
    operacion: boolean;
    informe1: boolean;
    informe2: boolean;
  };
  eliminados: string[]; // paths eliminados efectivamente
  omitidos: string[]; // paths que no se eliminaron (porque no existían o se canceló)
}

@Injectable({
  providedIn: "root",
})
export class DbFirestoreService {
  coleccion: string = "";
  componente: string = "";
  private firestore = inject(Firestore);
  basePath: string = `/Vantruck/datos`;

  constructor(
    private numeradorService: NumeradorService,
    private resumenOpCalculator: ResumenOpCalculatorService,
  ) {}

  /*   getAll(componente:string) {
    let dataCollection = collection(this.firestore, `/Vantruck/datos/${componente}`);
        
    return collectionData(dataCollection, {
      idField: 'id',
    }) as Observable<any[]>;
  } */

  ////////////////////////////////////////////////////////////////////////////////////
  getAllColectionUsers<T>(coleccion: string): Observable<ConIdType<T>[]> {
    const dataCollectionPath = `${coleccion}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(colRef, where("roles.god", "==", false));

    return new Observable<ConIdType<T>[]>((observer) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const changes: ConIdType<T>[] = snapshot
            .docChanges()
            .map((change) => ({
              id: change.doc.id,
              ...(change.doc.data() as T),
              type: change.type, // 'added', 'modified', 'removed'
            }));
          observer.next(changes);
        },
        (error) => observer.error(error),
      );

      // Cleanup
      return { unsubscribe };
    });
  }

  /*     getAllColectionLimit<T>(coleccion:string, limite:number) {
      const dataCollection = `/${coleccion}`;
      return this.firestore2.collection(dataCollection, (ref) => ref.orderBy('timestamp', 'desc').limit(limite)).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    } */

  getAllColectionRangeLimit<T>(
    coleccion: string,
    range1: any,
    range2: any,
    limite: number,
  ): Observable<ConIdType<T>[]> {
    const dataCollectionPath = `/Vantruck/datos/${coleccion}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      orderBy("timestamp", "desc"),
      where("timestamp", ">=", range1),
      where("timestamp", "<=", range2),
      limit(limite),
    );

    return new Observable<ConIdType<T>[]>((observer) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const changes: ConIdType<T>[] = snapshot
            .docChanges()
            .map((change) => ({
              id: change.doc.id,
              ...(change.doc.data() as T),
              type: change.type, // 'added', 'modified', 'removed'
            }));
          observer.next(changes);
        },
        (error) => observer.error(error),
      );

      // Cleanup
      return { unsubscribe };
    });
  }

  //////////NO BORRAARRR!!!!!!!!!!!
  /*     getAll<T>(componente: string): Observable<ConId<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    } */

  /*     getMostRecent<T>(componente: string, field: string): Observable<ConId<any>[]> {

      const dataCollectionPath = `/Vantruck/datos/${componente}`;
      const colRef = collection(this.firestore, dataCollectionPath);
      const q = query(
        colRef,        
        orderBy(field, 'desc'),
        limit(1) // Ordenar por id descendente y limitar a 1
      );

      return new Observable<ConIdType<T>[]>(observer => {
          const unsubscribe = onSnapshot(q, snapshot => {
            const changes: ConIdType<T>[] = snapshot.docChanges().map(change => ({
              id: change.doc.id,
              ...change.doc.data() as T,
              type: change.type // 'added', 'modified', 'removed'
            }));
            observer.next(changes);
          }, error => observer.error(error));

          // Cleanup
          return { unsubscribe };
        }); 
      
    } */

  //BUSCAR ELEMENTOS PARA VERIFICAR SI ESTAN DUPLICADOS
  getMostRecentId<T>(
    componente: string,
    field: string,
    campo: string,
    id: number,
  ): Observable<ConId<T>[]> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      orderBy(field, "desc"),
      limit(1), // Ordenar por id descendente y limitar a 1
      where(campo, "==", id),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as T),
        })),
      ),
    );
  }

  getMostRecentLimit<T>(
    componente: string,
    field: string,
    limite: number,
  ): Observable<ConId<T>[]> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      orderBy(field, "desc"),
      limit(limite), // Ordenar por id descendente y limitar a 1
    );

    return new Observable<ConIdType<T>[]>((observer) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const changes: ConIdType<T>[] = snapshot
            .docChanges()
            .map((change) => ({
              id: change.doc.id,
              ...(change.doc.data() as T),
              type: change.type, // 'added', 'modified', 'removed'
            }));
          observer.next(changes);
        },
        (error) => observer.error(error),
      );

      // Cleanup
      return { unsubscribe };
    });
  }

  getMostRecentLimitId<T>(
    componente: string,
    field: string,
    campo: string,
    id: any,
    limite: number,
  ): Observable<ConId<T>[]> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      orderBy(field, "desc"),
      limit(limite), // Ordenar por id descendente y limitar a 1
      where(campo, "==", id),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as T),
        })),
      ),
    );
  }

  /*    getAllByDateValue<T>(
  componente: string,
  campo: string,
  value1: any,
  value2: any,
  orden: any
): Observable<ConIdType<T>[]> {
  const dataCollectionPath = `/Vantruck/datos/${componente}`;
  const colRef = collection(this.firestore, dataCollectionPath);

  const q = query(
    colRef,
    orderBy(campo, orden),
    where(campo, '>=', value1),
    where(campo, '<=', value2)
  );

      return new Observable<ConIdType<T>[]>(observer => {
          const unsubscribe = onSnapshot(q, snapshot => {
            const changes: ConIdType<T>[] = snapshot.docChanges().map(change => ({
              id: change.doc.id,
              ...change.doc.data() as T,
              type: change.type // 'added', 'modified', 'removed'
            }));
            observer.next(changes);
          }, error => observer.error(error));

          // Cleanup
          return { unsubscribe };
        });


      } */

  getAllByDateValue<T>(
    componente: string,
    campo: string,
    value1: any,
    value2: any,
    orden: any,
  ): Observable<ConId<T>[]> {
    const dataCollection = collection(
      this.firestore,
      `/Vantruck/datos/${componente}`,
    );
    const q = query(
      dataCollection,
      orderBy(campo, orden),
      where(campo, ">=", value1),
      where(campo, "<=", value2),
    );
    return collectionData(q, { idField: "id" }) as Observable<ConId<T>[]>;
  }

  getAllByDateValueField<T>(
    componente: string,
    campo: string,
    value1: any,
    value2: any,
    field: string,
    value3: any,
  ) {
    // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
    // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)

    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      orderBy(campo, "desc"),
      where(campo, ">=", value1),
      where(campo, "<=", value2),
      where(field, "==", value3),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as T),
        })),
      ),
    );

    /*         return new Observable<ConIdType<T>[]>(observer => {
          const unsubscribe = onSnapshot(q, snapshot => {
            const changes: ConIdType<T>[] = snapshot.docChanges().map(change => ({
              id: change.doc.id,
              ...change.doc.data() as T,
              type: change.type // 'added', 'modified', 'removed'
            }));
            observer.next(changes);
          }, error => observer.error(error));

          // Cleanup
          return { unsubscribe };
        });
 */
  }

  buscarColeccionRangoFechaIdCampo<T>(
    componente: string,
    value1: any,
    value2: any,
    idCampo: string,
    idValue: number,
    campo: string,
    campoValue: any,
  ) {
    // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
    // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)

    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      orderBy("fecha", "desc"),
      where("fecha", ">=", value1),
      where("fecha", "<=", value2),
      where(idCampo, "==", idValue),
      where(campo, "==", campoValue),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as T),
        })),
      ),
    );
  }

  getAllColectionRangeIdValue<T>(
    componente: string,
    range1: any,
    range2: any,
    campo: string,
    filtro: string,
    valor: number,
  ): Observable<ConId<T>[]> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      where(filtro, "==", valor),
      where(campo, ">=", range1),
      where(campo, "<=", range2),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as T),
        })),
      ),
    );
    /* return new Observable<ConIdType<T>[]>(observer => {
          const unsubscribe = onSnapshot(q, snapshot => {
            const changes: ConIdType<T>[] = snapshot.docChanges().map(change => ({
              id: change.doc.id,
              ...change.doc.data() as T,
              type: change.type // 'added', 'modified', 'removed'
            }));
            observer.next(changes);
          }, error => observer.error(error));

          // Cleanup
          return { unsubscribe };
        }); */
  }

  getAllStateChanges<T>(componente: string): Observable<ConIdType<T>[]> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);

    return new Observable<ConIdType<T>[]>((observer) => {
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const changes: ConIdType<T>[] = snapshot
            .docChanges()
            .map((change) => ({
              id: change.doc.id,
              ...(change.doc.data() as T),
              type: change.type, // 'added', 'modified', 'removed'
            }));
          observer.next(changes);
        },
        (error) => observer.error(error),
      );

      // Cleanup callback
      return { unsubscribe };
    });
  }

  getAllStateChangesByField<T>(
    componente: string,
    campo: string,
    valor: any,
  ): Observable<ConIdType<T>[]> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);

    const q = query(colRef, where(campo, "==", valor));

    return new Observable<ConIdType<T>[]>((observer) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const changes: ConIdType<T>[] = snapshot
            .docChanges()
            .map((change) => ({
              id: change.doc.id,
              ...(change.doc.data() as T),
              type: change.type,
            }));

          observer.next(changes);
        },
        (error) => observer.error(error),
      );

      return { unsubscribe };
    });
  }

  /*     getAllStateChangesLimit<T>(componente: string, campo:string, id:number, orden:string, limit:number): Observable<ConIdType<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref => ref.where(campo, '==', id ).orderBy(orden, "desc").limit(limit)).stateChanges().pipe(
        map(changes =>
          changes.map(change => ({
            id: change.payload.doc.id,
            ...change.payload.doc.data() as T,
            type: change.type // 'added', 'modified', 'removed'
          } as ConIdType<T> ) )
        )
      );
    } */

  /* getAllStateChangesByDate<T>(
  componente: string,
  campo: string,
  orden: any,
  value1: any,
  value2: any
): Observable<ConIdType<T>[]> {
  const dataCollectionPath = `/Vantruck/datos/${componente}`;
  const colRef = collection(this.firestore, dataCollectionPath);

  const q = query(
    colRef,
    orderBy(campo, orden),
    where(campo, '>=', value1),
    where(campo, '<=', value2)
  );

  return new Observable<ConIdType<T>[]>(observer => {
    const unsubscribe = onSnapshot(q, snapshot => {
      const changes: ConIdType<T>[] = snapshot.docChanges().map(change => ({
        id: change.doc.id,
        ...change.doc.data() as T,
        type: change.type // 'added', 'modified', 'removed'
      }));
      observer.next(changes);
    }, error => observer.error(error));

    // Cleanup
    return { unsubscribe };
  });
} */

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  getAllSortedIdLimit<T>(
    componente: string,
    campo: string,
    id: number,
    campo2: string,
    orden: any,
    limite: number,
  ): Observable<ConId<T>[]> {
    // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
    // orden solo asc o desc

    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);

    const q = query(
      colRef,
      where(campo, "==", id),
      orderBy(campo2, orden),
      limit(limite),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as T),
        })),
      ),
    );
  }

  // this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))
  // this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))

  getByFieldValue<T>(
    componente: string,
    campo: string,
    value: any,
  ): Observable<ConId<T>[]> {
    // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
    // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
    // orden solo asc o desc

    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);

    const q = query(colRef, where(campo, "==", value));

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as T),
        })),
      ),
    );
  }

  getByDateValue<T>(
    componente: string,
    campo: string,
    value1: any,
    value2: any,
  ): Observable<ConIdType<T>[]> {
    // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
    // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
    // orden solo asc o desc

    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);

    const q = query(
      colRef,
      where(campo, ">=", value1),
      where(campo, "<=", value2),
    );

    return new Observable<ConIdType<T>[]>((observer) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const changes: ConIdType<T>[] = snapshot
            .docChanges()
            .map((change) => ({
              id: change.doc.id,
              ...(change.doc.data() as T),
              type: change.type, // 'added', 'modified', 'removed'
            }));
          observer.next(changes);
        },
        (error) => observer.error(error),
      );

      // Cleanup
      return { unsubscribe };
    });
  }

  // Método para obtener una tarifa específica
  obtenerTarifaIdTarifa(
    componente: string,
    id: number | string,
    campo: string,
  ): Observable<any | null> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(colRef, where(campo, "==", id));

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        if (snapshot.empty) {
          return null;
        } else {
          const doc = snapshot.docs[0];
          const data = doc.data() as any;
          data.id = doc.id;
          return data;
        }
      }),
    );
  }

  obtenerTarifaMasReciente(
    componente: string,
    id: number,
    campo: string,
    orden: string,
  ): Observable<any | null> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      where(campo, "==", id),
      orderBy(orden, "desc"),
      limit(1),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        if (snapshot.empty) {
          return null;
        } else {
          const doc = snapshot.docs[0];
          const data = doc.data() as any;
          data.id = doc.id;
          return data;
        }
      }),
    );
  }

  getDocObservable<T>(coleccion: string, id: string): Observable<T | null> {
    const ref = doc(this.firestore, `/Vantruck/datos/${coleccion}/${id}`);
    return docData(ref, { idField: "id" }).pipe(
      map(data => (data ? (data as T) : null))
    ) as Observable<T | null>;
  }

  get(id: string) {
    const estacionamiento1DocumentReference = doc(
      this.firestore,
      `/Vantruck/datos/${id}`,
    );
    return docData(estacionamiento1DocumentReference, { idField: "id" });
  }

  create(componente: string, item: any) {
    console.log("db.service, metodo create: ", this.coleccion);

    let dataCollection = collection(
      this.firestore,
      `/Vantruck/datos/${componente}`,
    );
    return addDoc(dataCollection, item).then(() =>
      console.log("Create. Escritura en la base de datos en: ", componente),
    );
  }

  async guardarFacturasOp(
    compCliente: string,
    infOpCliente: InformeOp,
    compChofer: string,
    infOpChofer: InformeOp,
    op: ConId<Operacion>,
    informesVenta?: InformeVenta[],
  ): Promise<{ exito: boolean; mensaje: string }> {
    const batch = writeBatch(this.firestore);

    try {
      // ==========================================================
      // 🔍 VALIDACIONES
      // ==========================================================

      const refCliente = collection(
        this.firestore,
        `/Vantruck/datos/${compCliente}`,
      );
      const qCliente = query(
        refCliente,
        where("idOperacion", "==", infOpCliente.idOperacion),
      );
      const snapCliente = await getDocs(qCliente);

      if (!snapCliente.empty) {
        throw new Error(
          `Ya existe un informe cliente para op ${infOpCliente.idOperacion}`,
        );
      }

      const refChofer = collection(
        this.firestore,
        `/Vantruck/datos/${compChofer}`,
      );
      const qChofer = query(
        refChofer,
        where("idOperacion", "==", infOpChofer.idOperacion),
      );
      const snapChofer = await getDocs(qChofer);

      if (!snapChofer.empty) {
        throw new Error(
          `Ya existe un informe chofer para op ${infOpChofer.idOperacion}`,
        );
      }

      const opRef = collection(this.firestore, `/Vantruck/datos/operaciones`);
      const qOp = query(opRef, where("idOperacion", "==", op.idOperacion));
      const snapOp = await getDocs(qOp);

      if (snapOp.empty) {
        throw new Error(`No se encontró operación ${op.idOperacion}`);
      }

      const docOpRef = snapOp.docs[0].ref;

      const opDoc = snapOp.docs[0];
      const opData = opDoc.data() as Operacion;

      if (opData.resumenProcesado) {
        throw new Error(
          `La operación ${op.idOperacion} ya fue procesada en resúmenes`,
        );
      }

      // ==========================================================
      // 📦 INFORMES DE VENTA
      // ==========================================================

      if (informesVenta?.length) {
        const colVenta = collection(
          this.firestore,
          `/Vantruck/datos/informesVenta`,
        );

        for (const infVenta of informesVenta) {
          const qVenta = query(
            colVenta,
            where("idInfVenta", "==", infVenta.idInfVenta),
          );
          const snapVenta = await getDocs(qVenta);

          if (!snapVenta.empty) {
            throw new Error(`Ya existe InformeVenta ${infVenta.idInfVenta}`);
          }

          const newVentaRef = doc(colVenta);
          batch.set(newVentaRef, infVenta);
        }
      }

      // ==========================================================
      // 📄 INFORMES OP
      // ==========================================================

      const informeRefCliente = doc(
        collection(this.firestore, `/Vantruck/datos/${compCliente}`),
      );
      const informeRefChofer = doc(
        collection(this.firestore, `/Vantruck/datos/${compChofer}`),
      );

      batch.set(informeRefCliente, infOpCliente);
      batch.set(informeRefChofer, infOpChofer);

      // ==========================================================
      // 🧾 ACTUALIZAR OPERACIÓN
      // ==========================================================

      const { id, ...opSinId } = op;
      batch.update(docOpRef, {
        ...opSinId,
        resumenProcesado: true,
      });

      // ==========================================================
      // 📊 RESÚMENES (🔥 NUEVO)
      // ==========================================================

      const updates = this.resumenOpCalculator.generarUpdates(op);

      if (!updates || updates.length === 0) {
        throw new Error("No se generaron updates de resumen");
      }

      for (const upd of updates) {
        const ref = doc(this.firestore, upd.path);

        const snap = await getDoc(ref);

        // 🔹 Si NO existe → crear estructura completa
        if (!snap.exists()) {
          const base = this.buildBaseData(upd.key);

          batch.set(ref, base); // sin merge
        }

        // 🔹 Aplicar increment SIEMPRE
        batch.update(ref, {
          ...upd.data,
          updatedAt: Date.now(),
        });
      }

      // ==========================================================
      // 🚀 COMMIT
      // ==========================================================

      await batch.commit();

      return {
        exito: true,
        mensaje: "Operación, informes y resúmenes guardados correctamente.",
      };
    } catch (error: any) {
      console.error("❌ Error en guardarFacturasOp:", error);

      return {
        exito: false,
        mensaje: error?.message || "Error al procesar la operación completa",
      };
    }
  }

  private buildBaseData(k: KeyResumen): any {
    const periodo = k.anio * 100 + k.mes;

    return {
      periodo,
      anio: k.anio,
      mes: k.mes,
      tipo: k.tipo,

      ...(k.tipo === "entidad" && {
        entidadId: k.entidadId,
        tipoEntidad: k.tipoEntidad,
      }),

      cliente: {
        acompValor: 0,
        kmAdicional: 0,
        tarifaBase: 0,
        adExtraValor: 0,
        total: 0,
      },

      chofer: {
        acompValor: 0,
        kmAdicional: 0,
        tarifaBase: 0,
        adExtraValor: 0,
        total: 0,
      },

      tarifaTipo: {
        general: 0,
        especial: 0,
        eventual: 0,
        personalizada: 0,
      },

      cantidadOps: 0,
      kmRecorridos: 0,
      acompanianteOps: 0,
      acompanianteCantidadTotal: 0,
      ganancia: 0,

      updatedAt: Date.now(),
    };
  }

  update(componente: string, item: any, uid: any) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(
      this.firestore,
      `/Vantruck/datos/${componente}/${uid}`,
    );
    console.log("update item: ", item);

    return updateDoc(estacionamiento1DocumentReference, { ...item });
  }

  /** Update parcial de un documento devolviendo Resultado (éxito/error), para que
   *  el caller registre el log según el resultado. Primer método de la familia
   *  CRUD-con-Resultado (createConResultado / deleteConResultado vendrán igual).
   *  Reemplaza progresivamente las escrituras vía StorageService.
   *  TODO: refactor Log — el log centralizado de StorageService no aplica acá; el
   *  caller debe loguear según el Resultado. */
  async updateConResultado(coleccion: string, id: string, data: any): Promise<Resultado> {
    try {
      await this.update(coleccion, data, id);
      return { exito: true, mensaje: 'Actualizado correctamente' };
    } catch (e: any) {
      return { exito: false, mensaje: `Error al actualizar ${coleccion}/${id}: ${e?.message ?? e}` };
    }
  }

  delete(componente: string, id: string) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(
      this.firestore,
      `/Vantruck/datos/${componente}/${id}`,
    );
    return deleteDoc(estacionamiento1DocumentReference).then(() =>
      console.log("Delete. borrado en la base de datos en: ", componente),
    );
  }

  updateUser(item: any) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(
      this.firestore,
      `/users/${item.id}`,
    );
    return updateDoc(estacionamiento1DocumentReference, { ...item });
  }

  deleteUser(id: string) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(
      this.firestore,
      `/users/${id}`,
    );
    return deleteDoc(estacionamiento1DocumentReference);
  }

  async guardarMultiple(
    objetos: any[],
    componenteAlta: string,
    idObjetoNombre: string,
    tipo: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const batch = writeBatch(this.firestore);
    const colRef = collection(
      this.firestore,
      `/Vantruck/datos/${componenteAlta}`,
    );

    try {
      // Verificar que NINGUNO de los objetos exista ya en la colección
      for (const obj of objetos) {
        const idValor: number =
          tipo === "operaciones" ? obj.idOperacion : obj.timestamp;

        const q = query(colRef, where(idObjetoNombre, "==", idValor));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Encontró un objeto ya existente => no continúa
          return {
            exito: false,
            mensaje: `Ya existe un documento con ${idObjetoNombre}: ${idValor}`,
          };
        }
      }

      // Ninguno existe => agregar todos al batch
      for (const obj of objetos) {
        const docRef = doc(colRef); // genera un id automático
        //let {id, type, ...objEdit} = obj
        batch.set(docRef, obj);
      }

      // Ejecutar el batch
      await batch.commit();

      return {
        exito: true,
        mensaje: "Todos los objetos fueron guardados correctamente.",
      };
    } catch (error: any) {
      console.error(error);
      return {
        exito: false,
        mensaje: `Error al guardar: ${error.message || error}`,
      };
    }
  }

  async guardarMultipleGeneral(
    objetos: any[],
    componenteAlta: string,
    propiedadConsulta: string,
    campoConsulta: number,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const batch = writeBatch(this.firestore);
    const colRef = collection(
      this.firestore,
      `/Vantruck/datos/${componenteAlta}`,
    );

    try {
      // Verificar que NINGUNO de los objetos exista ya en la colección
      for (const obj of objetos) {
        const q = query(colRef, where(propiedadConsulta, "==", campoConsulta));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Encontró un objeto ya existente => no continúa
          return {
            exito: false,
            mensaje: `Ya existe un documento con ${propiedadConsulta}: ${campoConsulta}`,
          };
        }
      }

      // Ninguno existe => agregar todos al batch
      for (const obj of objetos) {
        const docRef = doc(colRef); // genera un id automático
        //let {id, type, ...objEdit} = obj
        batch.set(docRef, obj);
      }

      // Ejecutar el batch
      await batch.commit();

      return {
        exito: true,
        mensaje: "Todos los objetos fueron guardados correctamente.",
      };
    } catch (error: any) {
      console.error(error);
      return {
        exito: false,
        mensaje: `Error al guardar: ${error.message || error}`,
      };
    }
  }

  mensajesError(msj: string, resultado: string) {
    Swal.fire({
      icon: resultado === "error" ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  async actualizarOperacionesBatch(
    operaciones: ConId<any>[],
    componente: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const batch = writeBatch(this.firestore);

    try {
      for (const operacion of operaciones) {
        const docRef = doc(
          this.firestore,
          `/Vantruck/datos/${componente}/${operacion.id}`,
        );
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          return {
            exito: false,
            mensaje: `No existe la operación con id: ${operacion.id}`,
          };
        }

        // Si existe, la agregamos al batch para actualizar
        let { id, ...op } = operacion;
        batch.update(docRef, op);
      }

      // Ejecutar el batch si todas las operaciones existen
      await batch.commit();
      return {
        exito: true,
        mensaje: "Las operaciones fueron actualizadas correctamente.",
      };
    } catch (error: any) {
      console.error(error);
      return {
        exito: false,
        mensaje: `Error al actualizar: ${error.message || error}`,
      };
    }
  }

  async actualizarMultiple(
    objetos: ConIdType<any>[],
    coleccion: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const batch = writeBatch(this.firestore);

    try {
      for (const obj of objetos) {
        const docRef = doc(
          this.firestore,
          `/Vantruck/datos/${coleccion}/${obj.id}`,
        );
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          return {
            exito: false,
            mensaje: `No existe la operación con id: ${obj.id}`,
          };
        }

        // Si existe, la agregamos al batch para actualizar
        let { id, type, ...objEdit } = obj;

        batch.update(docRef, objEdit);
      }
      // Ejecutar el batch si todas las operaciones existen
      await batch.commit();
      return {
        exito: true,
        mensaje: "Las objetos fueron actualizadas correctamente.",
      };
    } catch (error: any) {
      console.error(error);
      return {
        exito: false,
        mensaje: `Error al actualizar: ${error.message || error}`,
      };
    }
  }

  async eliminarMultiple(
    objetos: ConIdType<any>[],
    coleccion: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    const batch = writeBatch(this.firestore);

    try {
      for (const obj of objetos) {
        const docRef = doc(
          this.firestore,
          `/Vantruck/datos/${coleccion}/${obj.id}`,
        );
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          return {
            exito: false,
            mensaje: `No existe la operación con id: ${obj.id}`,
          };
        }

        // Si existe, la agregamos al batch para actualizar
        let { id, type, ...objEdit } = obj;
        batch.delete(docRef);
      }

      // Ejecutar el batch si todas las operaciones existen
      await batch.commit();
      return {
        exito: true,
        mensaje: "Las objetos fueron eliminados correctamente.",
      };
    } catch (error: any) {
      console.error(error);
      return {
        exito: false,
        mensaje: `Error al actualizar: ${error.message || error}`,
      };
    }
  }

  async guardarOpMultiple(
    operaciones: Operacion[],
  ): Promise<{ exito: boolean; mensaje: string }> {
    const batch = writeBatch(this.firestore);
    const colRef = collection(this.firestore, `/Vantruck/datos/operaciones`);

    try {
      // Validación interna: verificar duplicados dentro del mismo lote
      const ids = operaciones.map((op) => op.idOperacion);
      const idsDuplicados = ids.filter(
        (id, index) => ids.indexOf(id) !== index,
      );
      if (idsDuplicados.length > 0) {
        return {
          exito: false,
          mensaje: `Se encontraron ${idsDuplicados.length} operaciones duplicadas dentro del lote: ${idsDuplicados.join(", ")}`,
        };
      }

      // Verificación externa: verificar que NINGUNO ya exista en Firestore
      for (const idOperacion of ids) {
        const q = query(colRef, where("idOperacion", "==", idOperacion));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          return {
            exito: false,
            mensaje: `Ya existe una operación con idOperacion: ${idOperacion}`,
          };
        }
      }

      // Si todo está OK, agregar al batch
      for (const op of operaciones) {
        const docRef = doc(colRef); // id autogenerado
        batch.set(docRef, op);
      }

      await batch.commit();

      return {
        exito: true,
        mensaje: "Todas las operaciones fueron guardadas correctamente.",
      };
    } catch (error: any) {
      console.error("❌ Error al guardar operaciones múltiples:", error);
      return {
        exito: false,
        mensaje: `Error inesperado al guardar: ${error.message || error}`,
      };
    }
  }

  async guardarMultipleOtraColeccion(
    objetos: any[],
    coleccionAlta: string,
  ): Promise<{ exito: boolean; mensaje: string }> {
    try {
      // Dividir el array en chunks de máximo 500 elementos
      const chunkSize = 500;
      const chunks = [];

      for (let i = 0; i < objetos.length; i += chunkSize) {
        chunks.push(objetos.slice(i, i + chunkSize));
      }

      // Procesar cada chunk por separado
      for (const chunk of chunks) {
        const batch = writeBatch(this.firestore);
        const colRef = collection(
          this.firestore,
          `/Vantruck/datos/${coleccionAlta}`,
        );

        // Agregar todos los documentos del chunk al batch
        for (const obj of chunk) {
          const docRef = doc(colRef); // genera un id automático
          let { id, type, ...objEdit } = obj;
          batch.set(docRef, objEdit);
        }

        // Ejecutar el batch para este chunk
        await batch.commit();

        // Pequeña pausa entre chunks para evitar sobrecarga
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return {
        exito: true,
        mensaje: `Todos los objetos (${objetos.length}) fueron guardados correctamente en ${chunks.length} lotes.`,
      };
    } catch (error: any) {
      console.error(error);
      return {
        exito: false,
        mensaje: `Error al guardar: ${error.message || error}`,
      };
    }
  }

  /** Ejecuta un batch atómico con escrituras de colecciones potencialmente
   *  distintas. Chunking automático al límite de 500 ops por batch.
   *
   *  El campo 'modo' declara la INTENCIÓN del llamador:
   *   - 'crear'      → escritura que no debería duplicarse (ej. operaciones).
   *   - 'reemplazar' → escritura que sobrescribe deliberadamente (ej. tablero del día).
   *  TODO: anti-duplicado — el SDK web (firebase v11) NO expone batch.create(), que
   *  daría "fallar si el id ya existe" de forma atómica. Por ahora AMBOS modos
   *  ejecutan batch.set(). El riesgo de colisión es ínfimo porque los ids de
   *  operaciones se generan con generarId() (UUID aleatorio de Firestore). La
   *  protección real contra alta duplicada vive en el bloqueo de UI durante el
   *  alta; si en producción se observaran duplicados por reintento, agregar una
   *  clave de idempotencia verificada en runTransaction (el 'modo' ya distingue
   *  qué escrituras la necesitarían). Ver decisión de diseño del refactor Asignaciones.
   *
   *  ATOMICIDAD: cada chunk (≤500) es atómico. Si hay más de 500 escrituras se parte
   *  en varios chunks que NO son atómicos entre sí. Para la escala actual (alta diaria
   *  de decenas de ops) siempre hay un solo chunk → plenamente atómico.
   */
  async commitBatch(escrituras: EscrituraBatch[]): Promise<void> {
    const LIMITE = 500;

    for (let i = 0; i < escrituras.length; i += LIMITE) {
      const chunk = escrituras.slice(i, i + LIMITE);
      const batch = writeBatch(this.firestore);

      for (const e of chunk) {
        const ref = doc(this.firestore, `/Vantruck/datos/${e.coleccion}/${e.id}`);
        // TODO: anti-duplicado — cuando el SDK lo permita o se agregue idempotencia,
        // 'crear' debería fallar si el id ya existe. Hoy ambos modos usan set.
        if (e.modo === 'crear') {
          batch.set(ref, e.data);
        } else {
          batch.set(ref, e.data);
        }
      }

      await batch.commit();
    }
  }

  /** Escribe/reemplaza un documento por id SIN inyectar el id en el cuerpo.
   *  Patrón nuevo: el id es el doc id de Firestore, no se persiste dentro del
   *  documento; se reconstruye al leer (idField). Difiere de setItem, que fuerza
   *  { ...data, id } para entidades viejas que llevan el id adentro. */
  async setDocSinId<T extends { [key: string]: any }>(
    coleccion: string,
    id: string,
    data: T,
  ): Promise<void> {
    const docRef = doc(this.firestore, `Vantruck/datos/${coleccion}/${id}`);
    return await setDoc(docRef, data);
  }

  // 🔹 Guarda o reemplaza el tablero diario
  async setItem<T extends { [key: string]: any }>(
    coleccion: string,
    id: string,
    data: T,
  ): Promise<void> {
    console.log("📝 setItem() llamado para:", id, data);
    const docRef = doc(this.firestore, `Vantruck/datos/${coleccion}/${id}`);
    const cleanData = { ...data, id }; // fuerza que el id del objeto coincida con el del doc
    return await setDoc(docRef, cleanData);
  }

  async getTableroPorFecha(fecha: string): Promise<TableroDiario | null> {
    const docRef = doc(this.firestore, `Vantruck/datos/tableroDiario/${fecha}`);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return snapshot.data() as TableroDiario;
  }

  async getItemByField<T>(
    coleccion: string,
    campo: string,
    valor: any,
  ): Promise<ConId<T> | null> {
    const colRef = collection(this.firestore, `Vantruck/datos/${coleccion}`);
    const q = query(colRef, where(campo, "==", valor));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data() as T;

    return {
      ...data,
      id: docSnap.id,
    };
  }

  async deleteItem(coleccion: string, id: string): Promise<void> {
    const docRef = doc(this.firestore, `Vantruck/datos/${coleccion}/${id}`);
    await deleteDoc(docRef);
  }

  async obtenerDocsPorIdsOperacion(coleccion: string, idsOperacion: string[]) {
    const resultados: any[] = [];
    const encontrados: string[] = [];

    const grupos = this.dividirEnGrupos(idsOperacion, 10);

    for (const grupo of grupos) {
      const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
      const q = query(colRef, where("idOperacion", "in", grupo));
      const snapshot = await getDocs(q);

      snapshot.forEach((doc) => {
        const data = doc.data();
        resultados.push({ id: doc.id, ...data });
        if (data["idOperacion"] !== undefined) {
          encontrados.push(data["idOperacion"]);
        }
      });
    }

    const noEncontrados = idsOperacion.filter(
      (id) => !encontrados.includes(id),
    );

    return {
      encontrados: resultados,
      idsFaltantes: noEncontrados,
    };
  }

  // Función auxiliar
  dividirEnGrupos(array: any[], tamaño: number): any[][] {
    const grupos = [];
    for (let i = 0; i < array.length; i += tamaño) {
      grupos.push(array.slice(i, i + tamaño));
    }
    return grupos;
  }

  getInformesLiqPorTipoYFechas(
    tipo: "cliente" | "chofer" | "proveedor" | "todos",
    desde: string,
    hasta: string,
    estado: string,
  ): Promise<ConId<InformeLiq>[]> {
    const tipos =
      tipo === "todos" ? ["cliente", "chofer", "proveedor"] : [tipo];
    const colRef = collection(this.firestore, "/Vantruck/datos/resumenLiq");

    const q = query(
      colRef,
      where("estado", "==", estado),
      where("fecha", ">=", desde),
      where("fecha", "<=", hasta),
      where("tipo", "in", tipos),
      orderBy("fecha", "asc"),
    );

    return getDocs(q).then((snap) =>
      snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as InformeLiq) })),
    );
  }

  getInformesLiqPorPeriodo(
    tipo: "cliente" | "chofer" | "proveedor" | "todos",
    periodo: { mes: string; anio: number },
    estado: string,
  ): Promise<ConId<InformeLiq>[]> {
    const tipos =
      tipo === "todos" ? ["cliente", "chofer", "proveedor"] : [tipo];
    const colRef = collection(this.firestore, "/Vantruck/datos/resumenLiq");

    const q = query(
      colRef,
      where("estado", "==", estado),
      where("mes", "==", periodo.mes),
      where("anio", "==", periodo.anio),
      where("tipo", "in", tipos),
      orderBy("fecha", "asc"),
    );

    return getDocs(q).then((snap) =>
      snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as InformeLiq) })),
    );
  }

  async asignarNumerosInternosFaltantes(): Promise<void> {
    const colRef = collection(this.firestore, "/Vantruck/datos/resumenLiq");
    const q = query(colRef, orderBy("fecha"));
    const snapshot = await getDocs(q);

    const docs = snapshot.docs;

    for (const docSnap of docs) {
      const data = docSnap.data() as InformeLiq;

      // Saltar si ya tiene un número interno
      if (data.numeroInterno && data.numeroInterno !== "") continue;

      try {
        const nuevoNumero = await this.numeradorService.generarNumeroInterno(
          data.tipo,
        );
        const ref = doc(
          this.firestore,
          `/Vantruck/datos/resumenLiq/${docSnap.id}`,
        );
        await updateDoc(ref, { numeroInterno: nuevoNumero });
        console.log(
          `✅ Documento ${docSnap.id} actualizado con: ${nuevoNumero}`,
        );
      } catch (error) {
        console.error(`❌ Error actualizando ${docSnap.id}:`, error);
      }
    }

    console.log("🏁 Asignación de números internos finalizada.");
  }

  /**
   * Actualiza, de forma atómica (batch):
   *  - La Operacion (en /Vantruck/datos/operaciones)
   *  - El InformeOp original (colección recibida por parámetro)
   *  - La contra-parte del InformeOp (localizada con el método auxiliar)
   *  - (Opcional) El InformeLiq (si modo !== 'liquidacion')
   *
   * Si alguno de los documentos que deben existir NO existe, cancela todo.
   */
  async actualizarOperacionInformeOpYFactura(
    operacionActualizada: Operacion,
    informeOriginalActualizado: ConId<InformeOp>,
    coleccionInformeOriginal: string,
    modo: string,
    contraParteActualizada: ConId<InformeOp>,
    coleccionContraParte: string,
    facturaActualizada?: ConId<InformeLiq>,
    coleccionFactura?: string,
  ): Promise<Resultado> {
    try {
      // ------------------------------------------------------
      // 1) Verificaciones de existencia (pre-check)
      // ------------------------------------------------------

      // 1.1) Operación
      const { opDocRef, operacionDocData } =
        await this.obtenerOperacionPorIdOperacion(
          operacionActualizada.idOperacion,
        );
      if (!opDocRef) {
        return {
          exito: false,
          mensaje: `No existe Operacion con idOperacion ${operacionActualizada.idOperacion}.`,
        };
      }

      // 1.2) InformeOp original
      const informeOriginalRef = doc(
        this.firestore,
        `/Vantruck/datos/${coleccionInformeOriginal}/${informeOriginalActualizado.id}`,
      );
      const informeOriginalSnap = await getDoc(informeOriginalRef);
      if (!informeOriginalSnap.exists()) {
        return {
          exito: false,
          mensaje: `No existe el InformeOp original con id ${informeOriginalActualizado.id} en ${coleccionInformeOriginal}.`,
        };
      }

      // 1.3) Contra-parte (YA NO SE BUSCA, SOLO SE VALIDA EXISTENCIA)
      const contraParteRef = doc(
        this.firestore,
        `/Vantruck/datos/${coleccionContraParte}/${contraParteActualizada.id}`,
      );

      const contraParteSnap = await getDoc(contraParteRef);

      if (!contraParteSnap.exists()) {
        return {
          exito: false,
          mensaje: `No existe la contra-parte con id ${contraParteActualizada.id} en ${coleccionContraParte}.`,
        };
      }

      // 1.4) InformeLiq (solo si corresponde)
      let facturaRef: DocumentReference<DocumentData> | null = null;
      if (modo !== "liquidacion") {
        if (!facturaActualizada || !coleccionFactura) {
          return {
            exito: false,
            mensaje:
              "Se esperaba un InformeLiq y su colección, pero no fueron proporcionados.",
          };
        }
        facturaRef = doc(
          this.firestore,
          `/Vantruck/datos/${coleccionFactura}/${facturaActualizada.id}`,
        );
        const facturaSnap = await getDoc(facturaRef);
        if (!facturaSnap.exists()) {
          return {
            exito: false,
            mensaje: `No existe la factura (InformeLiq) con id ${facturaActualizada.id} en ${coleccionFactura}.`,
          };
        }
      }

      // ------------------------------------------------------
      // 2) Batch: actualizar todos juntos
      // ------------------------------------------------------
      const batch = writeBatch(this.firestore);

      // 2.1) Actualizar Operacion completa (o solo campos necesarios)
      //      Podés usar update si sabés que todas las keys existen; aquí uso set con merge true.
      batch.set(opDocRef, operacionActualizada, { merge: true });

      // 2.2) Actualizar InformeOp original
      const { id: _, ...informeOriginalSinId } = informeOriginalActualizado;
      batch.update(informeOriginalRef, informeOriginalSinId);

      // 2.3) Contra-parte (AHORA SE ACTUALIZA COMPLETA)
      const { id: _idContra, ...contraParteSinId } = contraParteActualizada;

      batch.update(contraParteRef, contraParteSinId);

      // 2.4) Factura (opcional)
      if (modo !== "liquidacion" && facturaRef) {
        const { id: _fid, ...facturaSinId } = facturaActualizada!;
        batch.update(facturaRef, facturaSinId);
      }

      // 2.5) (Opcional) Si querés forzar coherencias especiales por "modo",
      //      podés setear flags o campos acá con batch.update(...) en los documentos que correspondan.

      // =========================
      // 🔥 RESUMENES (DELTA)
      // =========================

      const updates = this.resumenOpCalculator.generarDeltaUpdates(
        operacionDocData!,
        operacionActualizada,
      );

      console.log("0)db service: updates:", updates);

      for (const upd of updates) {
        const ref = doc(this.firestore, upd.path);

        //const snap = await getDoc(ref);
        //console.log("EXISTE DOC:", snap.exists());
        //console.log("DATA:", snap.data());

        batch.set(
          ref,
          {
            periodo: upd.key.anio * 100 + upd.key.mes,
            anio: upd.key.anio,
            mes: upd.key.mes,
            tipo: upd.key.tipo,

            ...(upd.key.tipo === "entidad" && {
              entidadId: upd.key.entidadId,
              tipoEntidad: upd.key.tipoEntidad,
            }),

            ...upd.data,
            updatedAt: Date.now(),
          },
          { merge: true },
        );
      }

      // 3) Commit
      await batch.commit();

      return {
        exito: true,
        mensaje: "Actualización realizada correctamente y de forma atómica.",
      };
    } catch (err: any) {
      console.error("Error en actualizarOperacionInformeOpYFactura:", err);
      return { exito: false, mensaje: `Error: ${err?.message || err}` };
    }
  }

  // ------------------------------------------
  // MÉTODO AUXILIAR: Buscar contra-parte
  // ------------------------------------------
  /**
   * Busca la contra-parte de un InformeOp original, deduciendo las colecciones
   * a inspeccionar según:
   *  - Si el original es de Clientes => buscar en Choferes o Proveedores (según idProveedor)
   *  - Si el original es de Choferes/Proveedores => buscar en Clientes
   *  - Primero busca en la colección "no liquidada", luego en la "liquidada"
   *
   * Devuelve null si no la encuentra.
   */
  public async buscarContraParteInformeOp(
    informeOriginal: ConId<InformeOp>,
    coleccionOriginal: string,
  ): Promise<{
    docRef: DocumentReference<DocumentData>;
    data: ConId<InformeOp>;
    coleccion: string;
  } | null> {
    // Colecciones
    const COLS = {
      clientes: { noLiq: "informesOpClientes", liq: "infOpLiqClientes" },
      choferes: { noLiq: "informesOpChoferes", liq: "infOpLiqChoferes" },
      proveedores: {
        noLiq: "informesOpProveedores",
        liq: "infOpLiqProveedores",
      },
    };

    // Detectar "lado" del informe original
    const esCliente = coleccionOriginal.includes("Clientes");
    const esChofer = coleccionOriginal.includes("Choferes");
    const esProveedor = coleccionOriginal.includes("Proveedores");

    // Determinar a dónde buscar la contra-parte
    let targets: { noLiq: string; liq: string };

    if (esCliente) {
      // El original es del cliente ⇒ buscar chofer o proveedor
      targets =
        informeOriginal.idProveedor === '' ? COLS.choferes : COLS.proveedores;
    } else {
      // El original es del chofer o proveedor ⇒ buscar cliente
      targets = COLS.clientes;
    }

    // Buscar por contraParteId (idInfOp del otro informe)
    const contraId = informeOriginal.contraParteId;

    // 1) Primero "no liquidado"
    for (const colName of [targets.noLiq, targets.liq]) {
      const colRef = collection(this.firestore, `/Vantruck/datos/${colName}`);
      const qContra = query(colRef, where("idInfOp", "==", contraId));
      const snap = await getDocs(qContra);

      if (!snap.empty) {
        const d = snap.docs[0];
        const data = {
          id: d.id,
          ...(d.data() as InformeOp),
        } as ConId<InformeOp>;
        return { docRef: d.ref, data, coleccion: colName };
      }
    }

    return null;
  }

  // ------------------------------------------
  // AUX: Obtener Operacion por idOperacion
  // ------------------------------------------
  private async obtenerOperacionPorIdOperacion(idOperacion: string): Promise<{
    opDocRef: DocumentReference<DocumentData> | null;
    operacionDocData: Operacion | null;
  }> {
    const operacionesRef = collection(
      this.firestore,
      "/Vantruck/datos/operaciones",
    );
    const qOp = query(operacionesRef, where("idOperacion", "==", idOperacion));
    const snap = await getDocs(qOp);

    if (snap.empty) {
      return { opDocRef: null, operacionDocData: null };
    }

    const d = snap.docs[0];
    return { opDocRef: d.ref, operacionDocData: d.data() as Operacion };
  }

  async eliminarOperacionEInformes(
    operacion: Operacion,
    coleccionInforme1: string,
    coleccionInforme2: string,
  ): Promise<{ success: boolean; mensaje: string }> {
    try {
      const batch = writeBatch(this.firestore);

      // Referencias a las colecciones
      const opColRef = collection(this.firestore, "Vantruck/datos/operaciones");
      const infColRef1 = collection(
        this.firestore,
        `Vantruck/datos/${coleccionInforme1}`,
      );
      const infColRef2 = collection(
        this.firestore,
        `Vantruck/datos/${coleccionInforme2}`,
      );

      // Consultas por idOperacion
      const [opSnap, infSnap1, infSnap2] = await Promise.all([
        getDocs(
          query(opColRef, where("idOperacion", "==", operacion.idOperacion)),
        ),
        getDocs(
          query(infColRef1, where("idOperacion", "==", operacion.idOperacion)),
        ),
        getDocs(
          query(infColRef2, where("idOperacion", "==", operacion.idOperacion)),
        ),
      ]);

      if (opSnap.empty) {
        return {
          success: false,
          mensaje: "La operación no existe en la base de datos.",
        };
      }
      if (infSnap1.empty) {
        return {
          success: false,
          mensaje: `El informe de ${coleccionInforme1} no existe.`,
        };
      }
      if (infSnap2.empty) {
        return {
          success: false,
          mensaje: `El informe de ${coleccionInforme2} no existe.`,
        };
      }

      // Obtener referencias de los documentos a eliminar
      const opDocRef = doc(this.firestore, `${opSnap.docs[0].ref.path}`);
      const infDocRef1 = doc(this.firestore, `${infSnap1.docs[0].ref.path}`);
      const infDocRef2 = doc(this.firestore, `${infSnap2.docs[0].ref.path}`);

      // Agregar al batch
      batch.delete(opDocRef);
      batch.delete(infDocRef1);
      batch.delete(infDocRef2);

      // ==========================================================
      // 📊 RESÚMENES (ELIMINACIÓN)
      // ==========================================================

      const updates =
        this.resumenOpCalculator.generarUpdatesEliminacion(operacion);

      for (const upd of updates) {
        const ref = doc(this.firestore, upd.path);

        const snap = await getDoc(ref);

        if (!snap.exists()) {
          console.warn("Resumen inexistente al eliminar op:", upd.path);
          continue;
        }

        batch.update(ref, {
          ...upd.data,
          updatedAt: Date.now(),
        });
      }

      // Ejecutar el batch
      await batch.commit();

      return {
        success: true,
        mensaje: "Operación e informes eliminados correctamente.",
      };
    } catch (error) {
      console.error("❌ Error al eliminar documentos:", error);
      return {
        success: false,
        mensaje: "Error inesperado durante la eliminación.",
      };
    }
  }

  /**
   * Busca en una colección destino informesOp cuyo idOperacion coincida
   * con los idOperacion de los informes pasados en el array.
   *
   * @param informeOps Array de InformeOp base
   * @param coleccionDestino Ruta de la colección destino
   * @returns Promise<InformeOp[]> Array de informes encontrados (vacío si ninguno coincide)
   */
  async buscarInformesPorIdOperacion(
    informeOps: ConId<InformeOp>[],
    coleccionDestino: string,
  ): Promise<InformeOp[]> {
    try {
      const colRef = collection(
        this.firestore,
        `Vantruck/datos/${coleccionDestino}`,
      );
      const resultados: InformeOp[] = [];

      for (const inf of informeOps) {
        const snap = await getDocs(
          query(colRef, where("idOperacion", "==", inf.idOperacion)),
        );

        snap.forEach((docSnap) => {
          resultados.push(docSnap.data() as InformeOp);
        });
      }

      return resultados;
    } catch (error) {
      console.error("Error en buscarInformesPorIdOperacion:", error);
      return [];
    }
  }

  async existeCuit(coleccion: string, cuit: string): Promise<boolean> {
    try {
      const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
      const q = query(colRef, where("datosPersonales.cuit", "==", cuit));
      const snap = await getDocs(q);

      // Si encuentra al menos un documento, devuelve true
      return !snap.empty;
    } catch (error) {
      console.error("Error verificando CUIT:", error);
      throw error;
    }
  }

  async eliminarInformesPorIdOperacion(
    op: ConId<Operacion>,
    tipoContratacion: 'directo' | 'proveedor',
  ): Promise<void> {
    try {
      const batch = writeBatch(this.firestore);
      ///informe de cliente
      const colRef = collection(
        this.firestore,
        `Vantruck/datos/informesOpClientes`,
      );

      const clienteSnap = await getDocs(
        query(colRef, where("idOperacion", "==", op.idOperacion)),
      );

      if (clienteSnap.empty) {
        throw new Error(
          `No existe un informe de operacion con id ${op.idOperacion} en informesOpClientes`,
        );
      }

      const clienteSnapRef = doc(
        this.firestore,
        `${clienteSnap.docs[0].ref.path}`,
      );

      // Agregar al batch
      batch.delete(clienteSnapRef);

      if (tipoContratacion === 'directo') {
        const colRef = collection(
          this.firestore,
          `Vantruck/datos/informesOpChoferes`,
        );

        const choferSnap = await getDocs(
          query(colRef, where("idOperacion", "==", op.idOperacion)),
        );

        if (choferSnap.empty) {
          throw new Error(
            `No existe un informe de operacion con id ${op.idOperacion} en informesOpChoferes`,
          );
        }

        const choferSnapRef = doc(
          this.firestore,
          `${choferSnap.docs[0].ref.path}`,
        );

        // Agregar al batch
        batch.delete(choferSnapRef);
      } else {
        const colRef = collection(
          this.firestore,
          `Vantruck/datos/informesOpProveedores`,
        );

        const proveedorSnap = await getDocs(
          query(colRef, where("idOperacion", "==", op.idOperacion)),
        );

        if (proveedorSnap.empty) {
          throw new Error(
            `No existe un informe de operacion con id ${op.idOperacion} en informesOpProveedores`,
          );
        }

        const proveedorSnapRef = doc(
          this.firestore,
          `${proveedorSnap.docs[0].ref.path}`,
        );

        // Agregar al batch
        batch.delete(proveedorSnapRef);
      }

      // Ejecutar el batch
      await batch.commit();
      console.log("llego?");
    } catch (error) {
      console.error(
        "Error en la eliminación de los informes de operación:",
        error,
      );
    }
  }

  getObjIdg<T>(
    componente: string,
    campo: string,
    id: number,
  ): Observable<ConId<T>[]> {
    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);
    const q = query(
      colRef,
      where(campo, "==", id),
      //orderBy("timestamp", 'desc'),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as T),
        })),
      ),
    );
  }

  /** Genera un doc id nuevo para una colección SIN escribir nada.
   *  Permite conocer el id de un documento antes de persistirlo (necesario para
   *  batches atómicos donde un documento debe referenciar el id de otro). */
  generarId(coleccion: string): string {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    return doc(colRef).id;
  }

  createAndGetId(componente: string, item: any): Promise<string> {
    const dataCollection = collection(
      this.firestore,
      `/Vantruck/datos/${componente}`
    );
    const docRef = doc(dataCollection);
    return setDoc(docRef, item).then(() => {
      console.log('CreateAndGetId. Escritura en: ', componente, ' id: ', docRef.id);
      return docRef.id;
    });
  }

  async getByField<T>(
    componente: string,
    campo: string,
    valor: any,
  ): Promise<{ id: string; data: T }[]> {
    const colRef = collection(
      this.firestore,
      `/Vantruck/datos/${componente}`,
    );
    const q = query(colRef, where(campo, '==', valor));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, data: d.data() as T }));
  }
}
