import { Injectable } from "@angular/core";
/* import { AngularFirestore } from '@angular/fire/compat/firestore'; */

import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentData,
  DocumentReference,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  Transaction,
  QueryConstraint,
  QueryDocumentSnapshot,
  SetOptions,
} from "@angular/fire/firestore";
import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ConId, ConIdType } from "src/app/interfaces/conId";

import { Firestore } from "@angular/fire/firestore";
import { inject } from "@angular/core";
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";

export interface Resultado {
  exito: boolean;
  mensaje: string;
}

export type ModoEscritura = 'crear' | 'reemplazar' | 'eliminar' | 'actualizar' | 'fusionar';

export interface EscrituraBatch {
  coleccion: string;
  id: string;
  /** Cuando modo === 'actualizar', las keys de campos anidados van en
   *  notación de punto (ej. 'contraParte.monto'), NUNCA como objeto
   *  anidado — batch.update() reemplaza el sub-objeto entero si se le
   *  pasa un objeto, en vez de mergear el campo puntual.
   *  Cuando modo === 'fusionar' (set con { merge: true }) es AL REVÉS: los
   *  campos anidados van como OBJETO anidado (se mergean campo a campo), y
   *  una key con punto se guardaría como un campo literal con ese nombre.
   *  'fusionar' crea el documento si no existe — con increment() no hace
   *  falta leer antes (ej. resúmenes de Reportes, ResumenOpFactoryService). */
  data: any;
  modo: ModoEscritura;
}

/** Destino estructural común de WriteBatch y Transaction — ambos exponen
 *  set/update/delete con la misma semántica, y eso es lo único que usa
 *  aplicarEscritura(). */
interface DestinoEscritura {
  set(ref: DocumentReference<any>, data: any, options?: SetOptions): unknown;
  update(ref: DocumentReference<any>, data: any): unknown;
  delete(ref: DocumentReference<any>): unknown;
}

/** Página de resultados de getPaginado(). `cursor: null` cuando la página devuelta
 *  está vacía (nada más que paginar con este cursor); `hayMas` es la señal real de
 *  si conviene seguir pidiendo páginas. */
export interface PaginaResultado<T> {
  items: ConId<T>[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hayMas: boolean;
}

@Injectable({
  providedIn: "root",
})
export class DbFirestoreService {
  coleccion: string = "";
  private firestore = inject(Firestore);

  constructor() {}

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
    const q = query(colRef, where("role", "!=", "dev"));

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

  getDocObservable<T>(coleccion: string, id: string): Observable<T | null> {
    const ref = doc(this.firestore, `/Vantruck/datos/${coleccion}/${id}`);
    return docData(ref, { idField: "id" }).pipe(
      map(data => (data ? (data as T) : null))
    ) as Observable<T | null>;
  }

  /** Lectura one-shot por id, sin listener. null si el documento no existe. */
  async getById<T>(coleccion: string, id: string): Promise<T | null> {
    const ref = doc(this.firestore, `/Vantruck/datos/${coleccion}/${id}`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as T) : null;
  }

  /** Lectura one-shot paginada por rango de un campo de fecha/timestamp, con cursor
   *  real (`startAfter`, no offset/skip) y filtro de igualdad opcional sobre otro
   *  campo. `cursor: null` en la primera página; para la siguiente, pasar el
   *  `cursor` devuelto por la página anterior.
   *
   *  Pide `pageSize + 1` documentos para saber si hay más sin una query extra: si
   *  vuelven más de `pageSize`, se descarta el último y `hayMas` da `true`.
   *
   *  Nota: filtrar por `campoIgualdad` junto con el rango de `campoFecha` requiere un
   *  índice compuesto (`campoIgualdad` + `campoFecha`) — ver `firestore.indexes.json`. */
  async getPaginado<T>(
    coleccion: string,
    campoFecha: string,
    desde: number,
    hasta: number,
    pageSize: number,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
    filtro?: { campo: string; valor: any },
  ): Promise<PaginaResultado<T>> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const constraints: QueryConstraint[] = [
      orderBy(campoFecha, "desc"),
      where(campoFecha, ">=", desde),
      where(campoFecha, "<=", hasta),
    ];
    if (filtro) constraints.push(where(filtro.campo, "==", filtro.valor));
    if (cursor) constraints.push(startAfter(cursor));
    constraints.push(limit(pageSize + 1));

    const snap = await getDocs(query(colRef, ...constraints));
    const docsPagina = snap.docs.slice(0, pageSize);
    const items = docsPagina.map(d => ({ id: d.id, ...(d.data() as T) }));

    return {
      items,
      cursor: docsPagina.length > 0 ? docsPagina[docsPagina.length - 1] : null,
      hayMas: snap.docs.length > pageSize,
    };
  }

  /** InformeOp de un período en vivo, sin paginar, con estados
   *  múltiples (in). Usado por InformeOpService.observarPorPeriodo. */
  observarInformesOpPorPeriodo(
    coleccion: string,
    desde: string,
    hasta: string,
    tipo: 'cliente' | 'chofer' | 'proveedor',
    estados: ('activo' | 'proforma' | 'liquidado' | 'anulado')[],
  ): Observable<ConId<InformeOpNuevo>[]> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const q = query(
      colRef,
      where('tipo', '==', tipo),
      where('estado', 'in', estados),
      orderBy('fecha', 'desc'),
      where('fecha', '>=', desde),
      where('fecha', '<=', hasta),
    );
    // collectionData con idField solo agrega 'id', no 'idInfOp'. Sin este map, todo lo que
    // sale de acá (InformeOpListadoComponent.informesOp, la fuente de
    // InformeOpEditorComponent.@Input() informeOp en cada "editar" del
    // listado) queda con idInfOp undefined.
    return (collectionData(q, { idField: 'id' }) as Observable<ConId<InformeOpNuevo>[]>).pipe(
      map(items => items.map(item => ({ ...item, idInfOp: item.id }))),
    );
  }

  /** Listener en vivo de los documentos de `coleccion` con `campo == valor`.
   *  Una sola igualdad → no requiere índice compuesto (el orden se resuelve
   *  en memoria en el caller). Agrega `id` (doc id); el caller aplica su
   *  propio patrón ConId (idInfLiq, idInfOp, …). */
  observarPorCampo<T>(coleccion: string, campo: string, valor: any): Observable<ConId<T>[]> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const q = query(colRef, where(campo, '==', valor));
    return collectionData(q, { idField: 'id' }) as Observable<ConId<T>[]>;
  }

  /** Listener en vivo de los documentos de `coleccion` con `campo != valor`.
   *  Una sola desigualdad → índice simple automático (sin índice compuesto).
   *  Firestore excluye los documentos que no tienen el campo. Agrega `id`
   *  (doc id). Primer uso: comisiones con saldo pendiente (saldo != 0). */
  observarDistintoDe<T>(coleccion: string, campo: string, valor: any): Observable<ConId<T>[]> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const q = query(colRef, where(campo, '!=', valor));
    return collectionData(q, { idField: 'id' }) as Observable<ConId<T>[]>;
  }

  /** Listener en vivo de los documentos de `coleccion` con
   *  desde ≤ `campo` ≤ hasta (rango inclusivo sobre UN campo). Sin orderBy →
   *  índice simple automático (sin índice compuesto); el orden se resuelve en
   *  memoria en el caller. Agrega `id` (doc id). Primer uso: liquidaciones de
   *  comisiones por mes de corte (periodo). */
  observarPorRango<T>(
    coleccion: string,
    campo: string,
    desde: string | number,
    hasta: string | number,
  ): Observable<ConId<T>[]> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const q = query(colRef, where(campo, '>=', desde), where(campo, '<=', hasta));
    return collectionData(q, { idField: 'id' }) as Observable<ConId<T>[]>;
  }

  /** Listener en vivo: `campo == valor` y `campoIn in valores` (1 a 30
   *  valores). Índice compuesto (campo, campoIn) en firestore.indexes.json.
   *  Agrega `id` (doc id); el caller aplica su propio patrón ConId. Primer
   *  uso: InformeLiq facturados con saldo (estado == 'facturado',
   *  estadoFinanciero in ['pendiente','parcial']) — Finanzas. */
  observarPorCampoEIn<T>(
    coleccion: string,
    campo: string,
    valor: any,
    campoIn: string,
    valores: any[],
  ): Observable<ConId<T>[]> {
    if (valores.length === 0 || valores.length > 30) {
      throw new Error(`observarPorCampoEIn: 'in' admite de 1 a 30 valores (recibidos: ${valores.length}).`);
    }
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const q = query(colRef, where(campo, '==', valor), where(campoIn, 'in', valores));
    return collectionData(q, { idField: 'id' }) as Observable<ConId<T>[]>;
  }

  /** Listener en vivo de los documentos con `campo > valor`. Una sola
   *  desigualdad → índice simple automático (sin índice compuesto); el resto
   *  de los filtros y el orden se resuelven en memoria en el caller. Agrega
   *  `id` (doc id). Primer uso: movimientosFin con saldo sin imputar
   *  (sinImputar > 0) — Finanzas. */
  observarMayorQue<T>(coleccion: string, campo: string, valor: number | string): Observable<ConId<T>[]> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const q = query(colRef, where(campo, '>', valor));
    return collectionData(q, { idField: 'id' }) as Observable<ConId<T>[]>;
  }

  /** Consulta one-shot: `campoIn in valores` + rango inclusivo sobre
   *  `campoRango`, ordenada por `campoRango`. Requiere índice compuesto
   *  (campoIn, campoRango) en firestore.indexes.json. `valores`: 1 a 30
   *  elementos (límite de Firestore para 'in'). Agrega `id` (doc id); el
   *  caller aplica su propio patrón ConId (idInfLiq, …). */
  async consultarPorInYRango<T>(
    coleccion: string,
    campoIn: string,
    valores: any[],
    campoRango: string,
    desde: string,
    hasta: string,
    orden: 'asc' | 'desc' = 'desc',
  ): Promise<ConId<T>[]> {
    if (valores.length === 0) return [];
    if (valores.length > 30) {
      throw new Error(`consultarPorInYRango: 'in' admite hasta 30 valores (recibidos: ${valores.length}).`);
    }
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const q = query(
      colRef,
      where(campoIn, 'in', valores),
      where(campoRango, '>=', desde),
      where(campoRango, '<=', hasta),
      orderBy(campoRango, orden),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as T) }));
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

  /** Ejecuta un batch atómico con escrituras de colecciones potencialmente
   *  distintas. Chunking automático al límite de 500 ops por batch.
   *
   *  El campo 'modo' declara la INTENCIÓN del llamador:
   *   - 'crear'      → escritura que no debería duplicarse (ej. operaciones).
   *   - 'reemplazar' → escritura que sobrescribe deliberadamente (ej. tablero del día).
   *   - 'eliminar'   → hace batch.delete(ref); 'data' se ignora.
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
        this.aplicarEscritura(batch, e);
      }

      await batch.commit();
    }
  }

  /** Aplica UNA EscrituraBatch sobre un WriteBatch o una Transaction —
   *  mapeo modo → operación compartido por commitBatch y commitEnTransaccion.
   *  Guarda defensiva de id: sin esto, un id undefined se cuela en la ruta
   *  como el string "undefined" y Firestore crea un documento fantasma en
   *  vez de fallar.
   *  TODO: anti-duplicado — 'crear' debería fallar si el id ya existe; hoy
   *  'crear' y 'reemplazar' usan set (ver commitBatch). */
  private aplicarEscritura(destino: DestinoEscritura, e: EscrituraBatch): void {
    if (!e.id) {
      throw new Error(
        `aplicarEscritura: escritura sin id válido en la colección "${e.coleccion}" (modo: ${e.modo}). Escritura abortada para evitar crear un documento "undefined".`,
      );
    }
    const ref = doc(this.firestore, `/Vantruck/datos/${e.coleccion}/${e.id}`);
    if (e.modo === 'crear' || e.modo === 'reemplazar') {
      destino.set(ref, e.data);
    } else if (e.modo === 'fusionar') {
      destino.set(ref, e.data, { merge: true });
    } else if (e.modo === 'actualizar') {
      destino.update(ref, e.data);
    } else {
      destino.delete(ref);
    }
  }

  /** Variante TRANSACCIONAL de commitBatch — mismo contrato EscrituraBatch[],
   *  mismo mapeo (aplicarEscritura). Para acciones que necesitan LEER fresco
   *  antes de escribir (verificar estados, reservar numeradores):
   *    - `armar` recibe la Transaction, hace sus lecturas SOLO con
   *      leerEnTransaccion() y devuelve { escrituras, resultado }.
   *    - Recién después se aplican las escrituras: Firestore exige todas las
   *      lecturas antes que cualquier escritura — acá se cumple por
   *      construcción.
   *    - `armar` puede ejecutarse MÁS DE UNA VEZ (el SDK reintenta ante
   *      contención): tiene que ser pura — rearmar el array desde cero en
   *      cada intento, sin efectos laterales fuera de lecturas.
   *    - Sin chunking: si hay más escrituras que el límite, aborta (commitBatch,
   *      en cambio, parte en chunks que no son atómicos entre sí).
   *  Devuelve `resultado` (ej. el número interno reservado) una vez
   *  commiteada la transacción. */
  async commitEnTransaccion<R>(
    armar: (tx: Transaction) => Promise<{ escrituras: EscrituraBatch[]; resultado: R }>,
  ): Promise<R> {
    const LIMITE = 500;
    return runTransaction(this.firestore, async (tx) => {
      const { escrituras, resultado } = await armar(tx);
      if (escrituras.length > LIMITE) {
        throw new Error(
          `commitEnTransaccion: ${escrituras.length} escrituras superan el límite de ${LIMITE} por transacción.`,
        );
      }
      for (const e of escrituras) {
        this.aplicarEscritura(tx, e);
      }
      return resultado;
    });
  }

  /** Lectura de un documento DENTRO de una transacción — para usar en el
   *  callback `armar` de commitEnTransaccion. Encapsula la ruta base
   *  (/Vantruck/datos) igual que getById. Devuelve el body tal cual está en
   *  Firestore (sin agregar id: el caller aplica su patrón ConId). */
  async leerEnTransaccion<T>(tx: Transaction, coleccion: string, id: string): Promise<T | null> {
    const snap = await tx.get(doc(this.firestore, `/Vantruck/datos/${coleccion}/${id}`));
    return snap.exists() ? (snap.data() as T) : null;
  }

  // (TC3: reemplazarConVersionNueva retirado — el versionado de tarifas pasó a
  // TarifarioService.versionarEnTransaccion, sobre commitEnTransaccion con el
  // log adentro.)

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

  // ---- Herramientas de desarrollo (LimpiezaDemoService) ----

  /** Cantidad de documentos de una colección. Agregación en el servidor: no
   *  descarga los documentos (se factura 1 lectura cada 1000 docs). */
  async contarDocumentos(coleccion: string): Promise<number> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const snap = await getCountFromServer(colRef);
    return snap.data().count;
  }

  /** Consulta one-shot por rango de UN campo (desde ≤ campo ≤ hasta), con el
   *  id del documento (patrón ConId). Sin orderBy: no requiere índice
   *  compuesto. Usada por el recálculo de resúmenes (operaciones por
   *  'fecha', resumenesOp por 'periodo'). */
  async consultarPorRango<T>(
    coleccion: string,
    campo: string,
    desde: string | number,
    hasta: string | number,
  ): Promise<ConId<T>[]> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const snap = await getDocs(query(colRef, where(campo, '>=', desde), where(campo, '<=', hasta)));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as T) }));
  }

  /** Todos los documentos de una colección, con su id. Solo para
   *  colecciones chicas (ej. 'numeradores'). */
  async obtenerTodosConId<T>(coleccion: string): Promise<{ id: string; data: T }[]> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, data: d.data() as T }));
  }

  /** Borra TODOS los documentos de primer nivel de una colección, en lotes
   *  de hasta 500 (un writeBatch por lote; los lotes NO son atómicos entre
   *  sí). No borra subcolecciones (el modelo no las usa). Destructivo: su
   *  único caller es LimpiezaDemoService, que tiene guarda de proyecto demo
   *  y rol dev. Devuelve la cantidad borrada. */
  async eliminarTodosLosDocumentos(
    coleccion: string,
    alAvanzar?: (borrados: number) => void,
  ): Promise<number> {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    let total = 0;
    while (true) {
      const snap = await getDocs(query(colRef, limit(500)));
      if (snap.empty) break;
      const batch = writeBatch(this.firestore);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      total += snap.size;
      alAvanzar?.(total);
    }
    return total;
  }

  /** Genera un doc id nuevo para una colección SIN escribir nada.
   *  Permite conocer el id de un documento antes de persistirlo (necesario para
   *  batches atómicos donde un documento debe referenciar el id de otro). */
  generarId(coleccion: string): string {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    return doc(colRef).id;
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
