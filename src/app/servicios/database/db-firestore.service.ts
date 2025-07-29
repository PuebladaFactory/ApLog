import { Injectable } from '@angular/core';
/* import { AngularFirestore } from '@angular/fire/compat/firestore'; */
import { addDoc, collection, collectionData, CollectionReference, deleteDoc, doc, docData, DocumentData, DocumentReference, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { chunk } from 'lodash';
import { firstValueFrom, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConId, ConIdType } from 'src/app/interfaces/conId';

import { Operacion } from 'src/app/interfaces/operacion';
import Swal from 'sweetalert2';
import { Firestore } from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { TableroDiario } from 'src/app/raiz/operaciones/tablero-diario/tablero-diario.component';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { NumeradorService } from '../numerador/numerador.service';

export interface Resultado {
  exito: boolean;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class DbFirestoreService {

  coleccion: string = '';
  componente: string = '';
  private firestore = inject(Firestore);

  constructor(private numeradorService: NumeradorService) {

  }

/*   getAll(componente:string) {
    let dataCollection = collection(this.firestore, `/Vantruck/datos/${componente}`);
        
    return collectionData(dataCollection, {
      idField: 'id',
    }) as Observable<any[]>;
  } */

    

    ////////////////////////////////////////////////////////////////////////////////////
    getAllColectionUsers<T>(coleccion:string): Observable<ConIdType<T>[]> {
      const dataCollectionPath = `${coleccion}`;
      const colRef = collection(this.firestore, dataCollectionPath);
      const q = query(
        colRef,        
        where('roles.god', '==', false),
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

    getAllColectionRangeLimit<T>(coleccion:string, range1: any, range2:any,  limite:number): Observable<ConIdType<T>[]>  {

      const dataCollectionPath = `/Vantruck/datos/${coleccion}`;
      const colRef = collection(this.firestore, dataCollectionPath);
      const q = query(
        colRef,        
        orderBy('timestamp', 'desc'),
        where("timestamp", ">=", range1),
        where("timestamp", "<=", range2),
        limit(limite)
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
    getMostRecentId<T>(componente: string, field: string, campo:string, id:number): Observable<ConId<T>[]> {
      const dataCollectionPath = `/Vantruck/datos/${componente}`;
      const colRef = collection(this.firestore, dataCollectionPath);
      const q = query(
        colRef,        
        orderBy(field, 'desc'),
        limit(1), // Ordenar por id descendente y limitar a 1
        where(campo, "==" ,id)
      );

      return from(getDocs(q)).pipe(
        map(snapshot =>
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as T)
          }))
        )
      );


    }

    getMostRecentLimit<T>(componente: string, field: string, limite:number): Observable<ConId<T>[]> {

      const dataCollectionPath = `/Vantruck/datos/${componente}`;
      const colRef = collection(this.firestore, dataCollectionPath);
      const q = query(
        colRef,        
        orderBy(field, 'desc'),
        limit(limite), // Ordenar por id descendente y limitar a 1        
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

    }

    getMostRecentLimitId<T>(componente: string, field: string, campo:string, id:number, limite:number): Observable<ConId<T>[]> {
      
      const dataCollectionPath = `/Vantruck/datos/${componente}`;
      const colRef = collection(this.firestore, dataCollectionPath);
      const q = query(
        colRef,        
        orderBy(field, 'desc'),
        limit(limite), // Ordenar por id descendente y limitar a 1        
        where(campo, "==" ,id) 
      );
      
       return from(getDocs(q)).pipe(
        map(snapshot =>
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as T)
          }))
        )
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

      getAllByDateValue<T>(componente: string, campo: string, value1: any, value2: any, orden: any): Observable<ConId<T>[]> {
        const dataCollection = collection(this.firestore, `/Vantruck/datos/${componente}`);
        const q = query(dataCollection, orderBy(campo, orden), where(campo, '>=', value1), where(campo, '<=', value2));
        return collectionData(q, { idField: 'id' }) as Observable<ConId<T>[]>;
      }

      getAllByDateValueField<T>(componente:string, campo:string, value1:any, value2:any, field:string, value3:any){
        // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
        // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)

          const dataCollectionPath = `/Vantruck/datos/${componente}`;
          const colRef = collection(this.firestore, dataCollectionPath);
          const q = query(
            colRef,        
            orderBy(campo, 'desc'),
            where(campo, ">=", value1),
            where(campo, "<=", value2),
            where(field, "==", value3)
          );

        return from(getDocs(q)).pipe(
        map(snapshot =>
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as T)
          }))
        )
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

        buscarColeccionRangoFechaIdCampo<T>(componente:string, value1:any, value2:any, idCampo:string, idValue: number, campo:string, campoValue:any){
        // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
        // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)

          const dataCollectionPath = `/Vantruck/datos/${componente}`;
          const colRef = collection(this.firestore, dataCollectionPath);
          const q = query(
            colRef,        
            orderBy("fecha", 'desc'),
            where("fecha", ">=", value1),
            where("fecha", "<=", value2),
            where(idCampo, "==", idValue),
             where(campo, "==", campoValue),
          );

        return from(getDocs(q)).pipe(
        map(snapshot =>
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as T)
          }))
        )
      );
        
        }

    getAllColectionRangeIdValue<T>(componente:string, range1: any, range2:any,  campo:string, filtro:string, valor:number) : Observable<ConId<T>[]> {
      
      const dataCollectionPath = `/Vantruck/datos/${componente}`;
      const colRef = collection(this.firestore, dataCollectionPath);
      const q = query(
        colRef,        
        where(filtro, "==", valor),
        where(campo, ">=", range1),
        where(campo, "<=", range2)
      );

      return from(getDocs(q)).pipe(
          map(snapshot =>
            snapshot.docs.map(doc => ({
              id: doc.id,
              ...(doc.data() as T)
            }))
          )
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

      return new Observable<ConIdType<T>[]>(observer => {
        const unsubscribe = onSnapshot(colRef, snapshot => {
          const changes: ConIdType<T>[] = snapshot.docChanges().map(change => ({
            id: change.doc.id,
            ...change.doc.data() as T,
            type: change.type // 'added', 'modified', 'removed'
          }));
          observer.next(changes);
        }, error => observer.error(error));

        // Cleanup callback
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


getAllSortedIdLimit<T>(componente:string, campo:string, id:number, campo2:string, orden:any, limite:number) : Observable<ConId<T>[]> {
  // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
  // orden solo asc o desc

  const dataCollectionPath = `/Vantruck/datos/${componente}`;
  const colRef = collection(this.firestore, dataCollectionPath);

  const q = query(
    colRef,
    where(campo, '==', id ),
    orderBy(campo2, orden),
    limit(limite)
  );

   return from(getDocs(q)).pipe(
      map(snapshot =>
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as T)
        }))
      )
    );

  }

  // this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))
// this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))


getByFieldValue<T>(componente:string, campo:string, value:any): Observable<ConId<T>[]>{
  // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
  // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
  // orden solo asc o desc

  const dataCollectionPath = `/Vantruck/datos/${componente}`;
  const colRef = collection(this.firestore, dataCollectionPath);

  const q = query(
    colRef,
    where(campo, '==', value ),   
  );

  return from(getDocs(q)).pipe(
      map(snapshot =>
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as T)
        }))
      )
    );
  
  }



  getByDateValue<T>(componente:string, campo:string, value1:any, value2:any): Observable<ConIdType<T>[]>{
    // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
    // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
    // orden solo asc o desc

    const dataCollectionPath = `/Vantruck/datos/${componente}`;
    const colRef = collection(this.firestore, dataCollectionPath);

    const q = query(
      colRef,
      where(campo, ">=", value1),
      where(campo, "<=", value2)
      
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
    }



      // Método para obtener una tarifa específica
    obtenerTarifaIdTarifa(
      componente: string,
      id: number,
      campo: string
    ): Observable<any | null> {
      const dataCollectionPath = `/Vantruck/datos/${componente}`;
      const colRef = collection(this.firestore, dataCollectionPath);
      const q = query(colRef, where(campo, '==', id));

      return from(getDocs(q)).pipe(
        map(snapshot => {
          if (snapshot.empty) {
            return null;
          } else {
            const doc = snapshot.docs[0];
            const data = doc.data() as any;
            data.id = doc.id;
            return data;
          }
        })
      );
    }

      obtenerTarifaMasReciente(componente:string, id: number, campo:string, orden:string): Observable<any | null> {
        const dataCollectionPath = `/Vantruck/datos/${componente}`;
        const colRef = collection(this.firestore, dataCollectionPath);
        const q = query(
          colRef, 
          where(campo, '==', id),
          orderBy(orden, 'desc'),
          limit(1),
        );

        return from(getDocs(q)).pipe(
        map(snapshot => {
          if (snapshot.empty) {
            return null;
          } else {
            const doc = snapshot.docs[0];
            const data = doc.data() as any;
            data.id = doc.id;
            return data;
          }
        })
      );
 
      }
      



  get(id: string) {
    const estacionamiento1DocumentReference = doc(this.firestore, `/Vantruck/datos/${id}`);
    return docData(estacionamiento1DocumentReference, { idField: 'id' });
  }

  create(componente:string, item: any) {
    console.log("db.service, metodo create: ",this.coleccion);
    
    let dataCollection = collection(this.firestore, `/Vantruck/datos/${componente}`);
    return addDoc(dataCollection, item).then(() =>
      console.log('Create. Escritura en la base de datos en: ', componente)
    );
  }

  async guardarFacturasOp(compCliente:string, infOpCliente: InformeOp, compChofer: string, infOpChofer: InformeOp, op: ConId<Operacion>): Promise<{ exito: boolean; mensaje: string }> {        
    const batch = writeBatch(this.firestore);        
    
    try {
      // Verificar que no exista informe de operación para cliente
      const refCliente = collection(this.firestore, `/Vantruck/datos/${compCliente}`);
      const qCliente = query(refCliente, where('idOperacion', '==', infOpCliente.idOperacion));
      //console.log(`[${Date.now()}] Verificando existencia cliente...`);
      const snapCliente = await getDocs(qCliente);
      if (!snapCliente.empty) {
        throw new Error(`Ya existe un informe para el cliente con idFacturaOp ${infOpCliente.idOperacion}`);
      }
  
      // Verificar que no exista informe de operación para chofer
      const refChofer = collection(this.firestore, `/Vantruck/datos/${compChofer}`);
      const qChofer = query(refChofer, where('idOperacion', '==', infOpChofer.idOperacion));
      //console.log(`[${Date.now()}] Verificando existencia chofer...`);
      const snapChofer = await getDocs(qChofer);
      if (!snapChofer.empty) {
        throw new Error(`Ya existe un informe para el chofer con idFacturaOp ${infOpChofer.idOperacion}`);
      }
  
      // Verificar que exista la operación
      const opRef = collection(this.firestore, `/Vantruck/datos/operaciones`);
      const qOp = query(opRef, where('idOperacion', '==', op.idOperacion));
      //console.log(`[${Date.now()}] Verificando existencia operacion...`);
      const snapOp = await getDocs(qOp);
      if (snapOp.empty) {
        throw new Error(`No se encontró operación con idOperacion ${op.idOperacion}`);
      }
  
      const docOp = snapOp.docs[0];
      const docOpRef = docOp.ref;
  
      // Agregar informes
      const informeRefCliente = doc(collection(this.firestore, `/Vantruck/datos/${compCliente}`));
      const informeRefChofer = doc(collection(this.firestore, `/Vantruck/datos/${compChofer}`));
      batch.set(informeRefCliente, infOpCliente);
      batch.set(informeRefChofer, infOpChofer);
  
      // Editar operación
      const { id, ...opSinId } = op;
      batch.update(docOpRef, opSinId);
  
      // Ejecutar el batch
      console.log(`[${Date.now()}] Ejecutando batch commit...`);
      await batch.commit();
  
      return {
        exito: true,
        mensaje: 'Se guardaron los informes y se actualizó la operación correctamente.'
      };
    } catch (error: any) {
      console.error('Error al guardar facturas e informes de operación:', error);
      return {
        exito: false,
        mensaje: `Error: ${error.message || 'Ocurrió un problema al procesar la operación.'}`
      };
    }
  }

  update(componente: string, item: any, uid:any) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(
      this.firestore,
      `/Vantruck/datos/${componente}/${uid}`
    );
    console.log("update item: ", item);
    
    return updateDoc(estacionamiento1DocumentReference, { ...item });
  }

  delete(componente:string, id: string) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(this.firestore, `/Vantruck/datos/${componente}/${id}`);
    return deleteDoc(estacionamiento1DocumentReference).then(() =>
      console.log('Delete. borrado en la base de datos en: ', componente));
  }


  updateUser(item: any) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(
      this.firestore,
      `/users/${item.id}`
    );
    return updateDoc(estacionamiento1DocumentReference, { ...item });
  }

  deleteUser(id: string) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(this.firestore, `/users/${id}`);
    return deleteDoc(estacionamiento1DocumentReference);
  }

async procesarLiquidacion(
  informesSeleccionados: ConId<InformeOp>[],
  modo: string,
  componenteAlta: string,
  componenteBaja: string,
  factura: InformeLiq,
  componenteFactura: string
): Promise<{ exito: boolean; mensaje: string }> {
  const colOps = 'operaciones';
  const bloques = chunk(informesSeleccionados, 500);
  const reversionData: { docRef: ReturnType<typeof doc>, prevData: any }[] = [];
  const informesBackup: ConId<InformeOp>[] = [...informesSeleccionados]; // Backup en memoria  
  try {
    for (let i = 0; i < bloques.length; i++) {
      const batch = writeBatch(this.firestore);

      for (const informe of bloques[i]) {
        // 1. Buscar operación
        const operacionesRef = collection(this.firestore, `/Vantruck/datos/${colOps}`);
        const q = query(operacionesRef, where('idOperacion', '==', informe.idOperacion));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          throw new Error(`No se encontró operación con idOperacion ${informe.idOperacion}`);
        }

        const opDoc = querySnap.docs[0];
        const operacion = opDoc.data() as Operacion;
        const opDocRef = opDoc.ref;

        // 2. Guardar datos para reversión
        reversionData.push({ docRef: opDocRef, prevData: { ...operacion } });

        // 3. Actualizar estado de la operación
        const nuevoEstado = { ...operacion.estado };
        if (modo === 'cliente') {
          nuevoEstado.cerrada = false;
          nuevoEstado.facCliente = true;
        } else {
          nuevoEstado.cerrada = false;
          nuevoEstado.facChofer = true;
        }
        nuevoEstado.proformaCh = false;
        nuevoEstado.proformaCl = false;
        nuevoEstado.facturada = nuevoEstado.facCliente && nuevoEstado.facChofer;
        if(nuevoEstado.facturada){
          nuevoEstado.facCliente = false;
          nuevoEstado.facChofer = false;
        }

        batch.update(opDocRef, { estado: nuevoEstado });

        // 4. Verificar duplicado en destino
        const informeRefDestino = doc(this.firestore, `/Vantruck/datos/${componenteAlta}/${informe.id}`);
        const destinoSnap = await getDoc(informeRefDestino);
        if (destinoSnap.exists()) {
          throw new Error(`Ya existe un informe con id ${informe.id} en ${componenteAlta}`);
        }

        // 5. Verificar que el origen existe
        const informeRefOrigen = doc(this.firestore, `/Vantruck/datos/${componenteBaja}/${informe.id}`);
        const origenSnap = await getDoc(informeRefOrigen);
        if (!origenSnap.exists()) {
          throw new Error(`No se encontró el informe con id ${informe.id} en ${componenteBaja}`);
        }

        // 6. Mover informe (set en destino, delete en origen)
        informe.proforma = false;
        const { id, ...inf } = informe;
        batch.set(informeRefDestino, inf);
        batch.delete(informeRefOrigen);

        // 8. (NUEVO) Si modo !== 'clientes', buscar contra parte y marcarla
        if (modo !== 'cliente') {
          const contraParteRef = collection(this.firestore, `/Vantruck/datos/informesOpClientes`);
          const contraParteQuery = query(contraParteRef, where('idOperacion', '==', informe.idOperacion));
          const contraParteSnap = await getDocs(contraParteQuery);

          if (!contraParteSnap.empty) {
            const contraDoc = contraParteSnap.docs[0];
            const contraRef = contraDoc.ref;
            batch.update(contraRef, { contraParteProforma: false });
          } else {
            console.warn(`No se encontró contra parte con idOperacion ${informe.idOperacion} en facturaOpCliente`);
          }
        }
      }

      // 7. Ejecutar batch
      await batch.commit();
      console.log(`Batch ${i + 1} procesado correctamente.`);
    }

    // 8. Verificar existencia de factura duplicada
    const facturasRef = collection(this.firestore, `/Vantruck/datos/${componenteFactura}`);
    

    const facturaQuery = query(facturasRef, where('idFactura', '==', factura.idInfLiq));
    const facturaSnap = await getDocs(facturaQuery);
    if (!facturaSnap.empty) {
      throw new Error(`Ya existe una factura con idFactura ${factura.idInfLiq} en ${componenteFactura}`);
    }

    // 9. Guardar la factura
    await addDoc(facturasRef, factura);
    console.log('Factura guardada correctamente.');

    return {
      exito: true,
      mensaje: 'La liquidación y la factura se procesaron con éxito.'
    };
  } catch (error: any) {
    console.error('Error durante la liquidación o el guardado de la factura:', error);

    // Restaurar operaciones modificadas
    for (const { docRef, prevData } of reversionData) {
      try {
        await setDoc(docRef, prevData);
      } catch (revertErr) {
        console.error('Error al revertir operación:', revertErr);
      }
    }

    // Restaurar informes desde backup
    for (const informe of informesBackup) {
      try {
        const informeRef = doc(this.firestore, `/Vantruck/datos/${componenteBaja}/${informe.id}`);
        await setDoc(informeRef, informe); // reescribe el documento
      } catch (revertInfErr) {
        console.error('Error al restaurar informe:', revertInfErr);
      }
    }

    return {
      exito: false,
      mensaje: `Ocurrió un error: ${error.message || 'Error desconocido'}. Se revirtieron los cambios previos.`
    };
  }
}

async guardarMultiple(
  objetos: any[],
  componenteAlta: string,
  idObjetoNombre: string,
  tipo: string
): Promise<{ exito: boolean; mensaje: string }> {
  const batch = writeBatch(this.firestore);
  const colRef = collection(this.firestore, `/Vantruck/datos/${componenteAlta}`);
  
  try {
    // Verificar que NINGUNO de los objetos exista ya en la colección
    for (const obj of objetos) {
      const idValor: number = tipo === "operaciones" ? obj.idOperacion : obj.timestamp;

      const q = query(colRef, where(idObjetoNombre, "==", idValor));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Encontró un objeto ya existente => no continúa
        return {
          exito: false,
          mensaje: `Ya existe un documento con ${idObjetoNombre}: ${idValor}`
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

    return { exito: true, mensaje: "Todos los objetos fueron guardados correctamente." };
  } catch (error: any) {
    console.error(error);
    return { exito: false, mensaje: `Error al guardar: ${error.message || error}` };
  }
}


  mensajesError(msj:string, resultado:string){
      Swal.fire({
        icon: resultado === 'error' ? "error" : "success",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
      
    }

  async actualizarOperacionesBatch(
  operaciones: ConId<Operacion>[],
  componente: string
): Promise<{ exito: boolean; mensaje: string }> {
  const batch = writeBatch(this.firestore);
  
  try {
    for (const operacion of operaciones) {
      const docRef = doc(this.firestore, `/Vantruck/datos/${componente}/${operacion.id}`);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          exito: false,
          mensaje: `No existe la operación con id: ${operacion.id}`
        };
      }
     
      // Si existe, la agregamos al batch para actualizar
      let {id, ...op} = operacion
      batch.update(docRef, op);
    }

    // Ejecutar el batch si todas las operaciones existen
    await batch.commit();
    return {
      exito: true,
      mensaje: "Las operaciones fueron actualizadas correctamente."
    };
  } catch (error: any) {
    console.error(error);
    return {
      exito: false,
      mensaje: `Error al actualizar: ${error.message || error}`
    };
  }
}

async procesarProforma(
  informesSeleccionados: ConIdType<InformeOp>[],
  modo: string,
  componenteInformes: string,  
  
  factura: any,
  componenteProforma: string
): Promise<{ exito: boolean; mensaje: string }> {
  const colOps = 'operaciones';
  const bloques = chunk(informesSeleccionados, 500);
  const reversionData: { docRef: ReturnType<typeof doc>, prevData: any }[] = [];
  const informesBackup: ConId<InformeOp>[] = [...informesSeleccionados]; // Backup en memoria  
  try {
    for (let i = 0; i < bloques.length; i++) {
      const batch = writeBatch(this.firestore);

      for (const informe of bloques[i]) {
        // 1. Buscar operación
        const operacionesRef = collection(this.firestore, `/Vantruck/datos/${colOps}`);
        const q = query(operacionesRef, where('idOperacion', '==', informe.idOperacion));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          throw new Error(`No se encontró operación con idOperacion ${informe.idOperacion}`);
        }

        const opDoc = querySnap.docs[0];
        const operacion = opDoc.data() as Operacion;
        const opDocRef = opDoc.ref;

        // 2. Guardar datos para reversión
        reversionData.push({ docRef: opDocRef, prevData: { ...operacion } });

        // 3. Actualizar estado de la operación
        const nuevoEstado = { ...operacion.estado };
        if (modo === 'cliente') {
          nuevoEstado.cerrada = false;
          nuevoEstado.proformaCl = true;
          nuevoEstado.proformaCh = false; 
        } else {
          nuevoEstado.cerrada = false;
          nuevoEstado.proformaCl = false;
          nuevoEstado.proformaCh = true; 
        }

        batch.update(opDocRef, { estado: nuevoEstado });

        // 4. Verificar que el origen existe
        const informeRefOrigen = doc(this.firestore, `/Vantruck/datos/${componenteInformes}/${informe.id}`);
        const origenSnap = await getDoc(informeRefOrigen);
        if (!origenSnap.exists()) {
          throw new Error(`No se encontró el informe con id ${informe.id} en ${componenteInformes}`);
        }

        // 5. Mover informe (set en destino, delete en origen)
        informe.proforma = true;
        const { id, type,...inf } = informe;
        batch.update(informeRefOrigen, inf);

        // 6. (NUEVO) Si modo !== 'clientes', buscar contra parte y marcarla
        if (modo !== 'cliente') {
          const contraParteRef = collection(this.firestore, `/Vantruck/datos/informesOpClientes`);
          const contraParteQuery = query(contraParteRef, where('idOperacion', '==', informe.idOperacion));
          const contraParteSnap = await getDocs(contraParteQuery);

          if (!contraParteSnap.empty) {
            const contraDoc = contraParteSnap.docs[0];
            const contraRef = contraDoc.ref;
            batch.update(contraRef, { contraParteProforma: true });
          } else {
            console.warn(`No se encontró contra parte con idOperacion ${informe.idOperacion} en informesOpClientes`);
          }
        }
        
      }

      // 7. Ejecutar batch
      await batch.commit();
      console.log(`Batch ${i + 1} procesado correctamente.`);
    }

    // 8. Verificar existencia de factura duplicada
    const facturasRef = collection(this.firestore, `/Vantruck/datos/${componenteProforma}`);
/*     const idFactura = modo === 'clientes' ? factura.idFacturaCliente
                   : modo === 'choferes' ? factura.idFacturaChofer
                   : factura.idFacturaProveedor; */

    const facturaQuery = query(facturasRef, where('idInfLiq', '==', factura.idInfLiq));
    const facturaSnap = await getDocs(facturaQuery);
    if (!facturaSnap.empty) {
      throw new Error(`Ya existe una factura con idFactura ${factura.idInfLiq} en ${componenteProforma}`);
    }

    // 9. Guardar la factura
    await addDoc(facturasRef, factura);
    console.log('Factura guardada correctamente.');

    return {
      exito: true,
      mensaje: 'La liquidación y la factura se procesaron con éxito.'
    };
  } catch (error: any) {
    console.error('Error durante la liquidación o el guardado de la factura:', error);

    // Restaurar operaciones modificadas
    for (const { docRef, prevData } of reversionData) {
      try {
        await setDoc(docRef, prevData);
      } catch (revertErr) {
        console.error('Error al revertir operación:', revertErr);
      }
    }

    // Restaurar informes desde backup
    for (const informe of informesBackup) {
      try {
        const informeRef = doc(this.firestore, `/Vantruck/datos/${componenteInformes}/${informe.id}`);
        await setDoc(informeRef, informe); // reescribe el documento
      } catch (revertInfErr) {
        console.error('Error al restaurar informe:', revertInfErr);
      }
    }

    return {
      exito: false,
      mensaje: `Ocurrió un error: ${error.message || 'Error desconocido'}. Se revirtieron los cambios previos.`
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
      const docRef = doc(this.firestore, `/Vantruck/datos/${coleccion}/${obj.id}`);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          exito: false,
          mensaje: `No existe la operación con id: ${obj.id}`
        };
      }
    
      // Si existe, la agregamos al batch para actualizar
      let {id, type, ...objEdit} = obj
      batch.update(docRef, objEdit);
    }

    // Ejecutar el batch si todas las operaciones existen
    await batch.commit();
    return {
      exito: true,
      mensaje: "Las objetos fueron actualizadas correctamente."
    };
  } catch (error: any) {
    console.error(error);
    return {
      exito: false,
      mensaje: `Error al actualizar: ${error.message || error}`
    };
  }
}

async anularProforma(
  informesSeleccionados: ConIdType<InformeOp>[],
  modo: string,
  componenteInformes: string,
  
  factura: any,
  componenteProforma: string
): Promise<{ exito: boolean; mensaje: string }> {
  const colOps = 'operaciones';
  const bloques = chunk(informesSeleccionados, 500);
  const reversionData: { docRef: ReturnType<typeof doc>, prevData: any }[] = [];
  const informesBackup: ConId<InformeOp>[] = [...informesSeleccionados]; // Backup en memoria  
  try {
    for (let i = 0; i < bloques.length; i++) {
      const batch = writeBatch(this.firestore);

      for (const informe of bloques[i]) {
        // 1. Buscar operación
        const operacionesRef = collection(this.firestore, `/Vantruck/datos/${colOps}`);
        const q = query(operacionesRef, where('idOperacion', '==', informe.idOperacion));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          throw new Error(`No se encontró operación con idOperacion ${informe.idOperacion}`);
        }

        const opDoc = querySnap.docs[0];
        const operacion = opDoc.data() as Operacion;
        const opDocRef = opDoc.ref;

        // 2. Guardar datos para reversión
        reversionData.push({ docRef: opDocRef, prevData: { ...operacion } });

        // 3. Actualizar estado de la operación
        const nuevoEstado = { ...operacion.estado };
        nuevoEstado.cerrada = nuevoEstado.facCliente ? false: nuevoEstado.facChofer ? false: true;
        nuevoEstado.proformaCl = false;
        nuevoEstado.proformaCh = false;

        batch.update(opDocRef, { estado: nuevoEstado });

        // 4. Verificar duplicado en destino
        /* const informeRefDestino = doc(this.firestore, `/Vantruck/datos/${componenteAlta}/${informe.id}`);
        const destinoSnap = await getDoc(informeRefDestino);
        if (destinoSnap.exists()) {
          throw new Error(`Ya existe un informe con id ${informe.id} en ${componenteAlta}`);
        } */

        // 5. Verificar que el origen existe
        const informeRefOrigen = doc(this.firestore, `/Vantruck/datos/${componenteInformes}/${informe.id}`);
        const origenSnap = await getDoc(informeRefOrigen);
        if (!origenSnap.exists()) {
          throw new Error(`No se encontró el informe con id ${informe.id} en ${componenteInformes}`);
        }

        // 6. Mover informe (set en destino, delete en origen)
        informe.proforma = false;
        informe.liquidacion = false;
        const { id, type,...inf } = informe;
        batch.update(informeRefOrigen, inf);


         // 6. (NUEVO) Si modo !== 'clientes', buscar contra parte y marcarla
        if (modo !== 'cliente') {
          const contraParteRef = collection(this.firestore, `/Vantruck/datos/informesOpClientes`);
          const contraParteQuery = query(contraParteRef, where('idOperacion', '==', informe.idOperacion));
          const contraParteSnap = await getDocs(contraParteQuery);

          if (!contraParteSnap.empty) {
            const contraDoc = contraParteSnap.docs[0];
            const contraRef = contraDoc.ref;
            batch.update(contraRef, { contraParteProforma: false });
          } else {
            console.warn(`No se encontró contra parte con idOperacion ${informe.idOperacion} en facturaOpCliente`);
          }
        }

        
      }

      // 7. Ejecutar batch
      await batch.commit();
      console.log(`Batch ${i + 1} procesado correctamente.`);
    }

    // 8. Verificar existencia de factura duplicada
    /* const facturasRef = collection(this.firestore, `/Vantruck/datos/${componenteProforma}`);
    const idFactura = modo === 'clientes' ? factura.idFacturaCliente
                   : modo === 'choferes' ? factura.idFacturaChofer
                   : factura.idFacturaProveedor;

    const facturaQuery = query(facturasRef, where('idFactura', '==', idFactura));
    const facturaSnap = await getDocs(facturaQuery);
    if (!facturaSnap.empty) {
      throw new Error(`Ya existe una factura con idFactura ${idFactura} en ${componenteProforma}`);
    } */
    const facturaRefOrigen = doc(this.firestore, `/Vantruck/datos/${componenteProforma}/${factura.id}`);
    const origenFacturaSnap = await getDoc(facturaRefOrigen);
    
    if (!origenFacturaSnap.exists())  {
      throw new Error(`No existe una factura con id ${factura.id} en ${componenteProforma}`);
    } 

    // 9. Guardar la factura
    await deleteDoc(facturaRefOrigen);
    console.log('Factura eliminada correctamente.');

    return {
      exito: true,
      mensaje: 'La proforma se anulo con éxito.'
    };
  } catch (error: any) {
    console.error('Error durante la anulación de la proforma:', error);

    // Restaurar operaciones modificadas
    for (const { docRef, prevData } of reversionData) {
      try {
        await setDoc(docRef, prevData);
      } catch (revertErr) {
        console.error('Error al revertir operación:', revertErr);
      }
    }

    // Restaurar informes desde backup
    for (const informe of informesBackup) {
      try {
        const informeRef = doc(this.firestore, `/Vantruck/datos/${componenteInformes}/${informe.id}`);
        await setDoc(informeRef, informe); // reescribe el documento
      } catch (revertInfErr) {
        console.error('Error al restaurar informe:', revertInfErr);
      }
    }

    return {
      exito: false,
      mensaje: `Ocurrió un error: ${error.message || 'Error desconocido'}. Se revirtieron los cambios previos.`
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
      const docRef = doc(this.firestore, `/Vantruck/datos/${coleccion}/${obj.id}`);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          exito: false,
          mensaje: `No existe la operación con id: ${obj.id}`
        };
      }
    
      // Si existe, la agregamos al batch para actualizar
      let {id, type, ...objEdit} = obj
      batch.delete(docRef);
    }

    // Ejecutar el batch si todas las operaciones existen
    await batch.commit();
    return {
      exito: true,
      mensaje: "Las objetos fueron eliminados correctamente."
    };
  } catch (error: any) {
    console.error(error);
    return {
      exito: false,
      mensaje: `Error al actualizar: ${error.message || error}`
    };
  }
}

async guardarOpMultiple(
  operaciones: Operacion[],  
): Promise<{ exito: boolean; mensaje: string }> {
  const batch = writeBatch(this.firestore);
  const colRef = collection(this.firestore, `/Vantruck/datos/operaciones`);
  
  try {
    // Verificar que NINGUNO de los objetos exista ya en la colección
    for (const op of operaciones) {      

      const q = query(colRef, where("idOperacion", "==", op.idOperacion));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Encontró un objeto ya existente => no continúa
        return {
          exito: false,
          mensaje: `Ya existe un documento con idOperacion: ${op.idOperacion}`
        };
      }
    }

    // Ninguno existe => agregar todos al batch
    for (const op of operaciones) {
      
      const docRef = doc(colRef); // genera un id automático
      //let {id, type, ...objEdit} = obj
      batch.set(docRef, op);
    }

    // Ejecutar el batch
    await batch.commit();

    return { exito: true, mensaje: "Todos los objetos fueron guardados correctamente." };
  } catch (error: any) {
    console.error(error);
    return { exito: false, mensaje: `Error al guardar: ${error.message || error}` };
  }
}

async guardarMultipleOtraColeccion(
  objetos: any[],
  coleccionAlta: string,  
): Promise<{ exito: boolean; mensaje: string }> {
  const batch = writeBatch(this.firestore);
  const colRef = collection(this.firestore, `/Vantruck/datos/${coleccionAlta}`);
  
  try {
    // Verificar que NINGUNO de los objetos exista ya en la colección
    for (const obj of objetos) {
      const docRef = doc(this.firestore, `/Vantruck/datos/${coleccionAlta}/${obj.id}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          exito: false,
          mensaje: `Ya existe un documento con id: ${obj.id} en la colección ${coleccionAlta}`
        };
      }

    }

    // Ninguno existe => agregar todos al batch
    for (const obj of objetos) {
      
      const docRef = doc(colRef); // genera un id automático
      let {id, type, ...objEdit} = obj
      batch.set(docRef, objEdit);
    }

    // Ejecutar el batch
    await batch.commit();

    return { exito: true, mensaje: "Todos los objetos fueron guardados correctamente." };
  } catch (error: any) {
    console.error(error);
    return { exito: false, mensaje: `Error al guardar: ${error.message || error}` };
  }
}

// 🔹 Guarda o reemplaza el tablero diario
async setItem<T extends { [key: string]: any }>(
  coleccion: string,
  id: string,
  data: T
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
  valor: any
): Promise<ConId<T> | null> {
  const colRef = collection(this.firestore, `Vantruck/datos/${coleccion}`);
  const q = query(colRef, where(campo, '==', valor));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) return null;

  const docSnap = querySnapshot.docs[0];
  const data = docSnap.data() as T;

  return {
    ...data,
    id: docSnap.id
  };
}

async deleteItem(coleccion: string, id: string): Promise<void> {
  const docRef = doc(this.firestore, `Vantruck/datos/${coleccion}/${id}`);
  await deleteDoc(docRef);
}

async obtenerDocsPorIdsOperacion(coleccion: string, idsOperacion: number[]) {
  const resultados: any[] = [];
  const encontrados: number[] = [];

  const grupos = this.dividirEnGrupos(idsOperacion, 10);

  for (const grupo of grupos) {
    const colRef = collection(this.firestore, `/Vantruck/datos/${coleccion}`);
    const q = query(colRef, where('idOperacion', 'in', grupo));
    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
      const data = doc.data();
      resultados.push({ id: doc.id, ...data });
      if (data['idOperacion'] !== undefined) {
        encontrados.push(data['idOperacion']);
      }
    });
  }

  const noEncontrados = idsOperacion.filter(id => !encontrados.includes(id));

  return {
    encontrados: resultados,
    idsFaltantes: noEncontrados
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
    tipo: 'cliente' | 'chofer' | 'proveedor' | 'todos',
    desde: string,
    hasta: string
  ): Promise<ConId<InformeLiq>[]> {
    const tipos = tipo === 'todos' ? ['cliente', 'chofer', 'proveedor'] : [tipo];
    const colRef = collection(this.firestore, '/Vantruck/datos/resumenLiq');

    const q = query(
      colRef,
      where('estado', '==', 'emitido'),
      where('fecha', '>=', desde),
      where('fecha', '<=', hasta),
      where('tipo', 'in', tipos),
      orderBy('fecha', 'asc')
    );

    return getDocs(q).then(snap =>
      snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as InformeLiq) }))
    );
  }

  async asignarNumerosInternosFaltantes(): Promise<void> {
    const colRef = collection(this.firestore, '/Vantruck/datos/resumenLiq');
    const q = query(colRef, orderBy('fecha'));
    const snapshot = await getDocs(q);

    const docs = snapshot.docs;

    for (const docSnap of docs) {
      const data = docSnap.data() as InformeLiq;

      // Saltar si ya tiene un número interno
      if (data.numeroInterno && data.numeroInterno !== '') continue;

      try {
        const nuevoNumero = await this.numeradorService.generarNumeroInterno(data.tipo);
        const ref = doc(this.firestore, `/Vantruck/datos/resumenLiq/${docSnap.id}`);
        await updateDoc(ref, { numeroInterno: nuevoNumero });
        console.log(`✅ Documento ${docSnap.id} actualizado con: ${nuevoNumero}`);
      } catch (error) {
        console.error(`❌ Error actualizando ${docSnap.id}:`, error);
      }
    }

    console.log('🏁 Asignación de números internos finalizada.');
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
    facturaActualizada?: ConId<InformeLiq>,
    coleccionFactura?: string
  ): Promise<Resultado> {
    try {
      // ------------------------------------------------------
      // 1) Verificaciones de existencia (pre-check)
      // ------------------------------------------------------

      // 1.1) Operación
      const { opDocRef, operacionDocData } = await this.obtenerOperacionPorIdOperacion(operacionActualizada.idOperacion);
      if (!opDocRef) {
        return { exito: false, mensaje: `No existe Operacion con idOperacion ${operacionActualizada.idOperacion}.` };
      }      
      
      // 1.2) InformeOp original
      const informeOriginalRef = doc(this.firestore, `/Vantruck/datos/${coleccionInformeOriginal}/${informeOriginalActualizado.id}`);
      const informeOriginalSnap = await getDoc(informeOriginalRef);
      if (!informeOriginalSnap.exists()) {
        return { exito: false, mensaje: `No existe el InformeOp original con id ${informeOriginalActualizado.id} en ${coleccionInformeOriginal}.` };
      }      

      // 1.3) Contra-parte
      const contraParte = await this.buscarContraParteInformeOp(informeOriginalActualizado, coleccionInformeOriginal);
      if (!contraParte) {
        return { exito: false, mensaje: 'No se encontró la contra-parte del InformeOp proporcionado.' };
      }      

      const { docRef: contraParteRef, data: contraParteData } = contraParte;

      // 1.4) InformeLiq (solo si corresponde)
      let facturaRef: DocumentReference<DocumentData> | null = null;
      if (modo !== 'liquidacion') {
        if (!facturaActualizada || !coleccionFactura) {
          return { exito: false, mensaje: 'Se esperaba un InformeLiq y su colección, pero no fueron proporcionados.' };
        }
        facturaRef = doc(this.firestore, `/Vantruck/datos/${coleccionFactura}/${facturaActualizada.id}`);
        const facturaSnap = await getDoc(facturaRef);
        if (!facturaSnap.exists()) {
          return { exito: false, mensaje: `No existe la factura (InformeLiq) con id ${facturaActualizada.id} en ${coleccionFactura}.` };
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

      // 2.3) Actualizar contra-parte: solo contraParteMonto (y lo que quieras)
      const nuevoContraParteMonto = informeOriginalActualizado.valores.total;
      batch.update(contraParteRef, { contraParteMonto: nuevoContraParteMonto });

      // 2.4) Factura (opcional)
      if (modo !== 'liquidacion' && facturaRef) {
        const { id: _fid, ...facturaSinId } = facturaActualizada!;
        batch.update(facturaRef, facturaSinId);
      }

      // 2.5) (Opcional) Si querés forzar coherencias especiales por "modo",
      //      podés setear flags o campos acá con batch.update(...) en los documentos que correspondan.

      // 3) Commit
      await batch.commit();

      return { exito: true, mensaje: 'Actualización realizada correctamente y de forma atómica.' };

    } catch (err: any) {
      console.error('Error en actualizarOperacionInformeOpYFactura:', err);
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
  private async buscarContraParteInformeOp(
    informeOriginal: ConId<InformeOp>,
    coleccionOriginal: string
  ): Promise<{ docRef: DocumentReference<DocumentData>, data: ConId<InformeOp>, coleccion: string } | null> {

    // Colecciones
    const COLS = {
      clientes:     { noLiq: 'informesOpClientes',   liq: 'infOpLiqClientes' },
      choferes:     { noLiq: 'informesOpChoferes',   liq: 'infOpLiqChoferes' },
      proveedores:  { noLiq: 'informesOpProveedores',liq: 'infOpLiqProveedores' },
    };

    // Detectar "lado" del informe original
    const esCliente      = coleccionOriginal.includes('Clientes');
    const esChofer       = coleccionOriginal.includes('Choferes');
    const esProveedor    = coleccionOriginal.includes('Proveedores');

    // Determinar a dónde buscar la contra-parte
    let targets: { noLiq: string; liq: string };

    if (esCliente) {
      // El original es del cliente ⇒ buscar chofer o proveedor
      targets = informeOriginal.idProveedor === 0 ? COLS.choferes : COLS.proveedores;
    } else {
      // El original es del chofer o proveedor ⇒ buscar cliente
      targets = COLS.clientes;
    }

    // Buscar por contraParteId (idInfOp del otro informe)
    const contraId = informeOriginal.contraParteId;

    // 1) Primero "no liquidado"
    for (const colName of [targets.noLiq, targets.liq]) {
      const colRef = collection(this.firestore, `/Vantruck/datos/${colName}`);
      const qContra = query(colRef, where('idInfOp', '==', contraId));
      const snap = await getDocs(qContra);

      if (!snap.empty) {
        const d = snap.docs[0];
        const data = { id: d.id, ...(d.data() as InformeOp) } as ConId<InformeOp>;
        return { docRef: d.ref, data, coleccion: colName };
      }
    }

    return null;
  }

  // ------------------------------------------
  // AUX: Obtener Operacion por idOperacion
  // ------------------------------------------
  private async obtenerOperacionPorIdOperacion(
    idOperacion: number
  ): Promise<{ opDocRef: DocumentReference<DocumentData> | null, operacionDocData: Operacion | null }> {
    const operacionesRef = collection(this.firestore, '/Vantruck/datos/operaciones');
    const qOp = query(operacionesRef, where('idOperacion', '==', idOperacion));
    const snap = await getDocs(qOp);

    if (snap.empty) {
      return { opDocRef: null, operacionDocData: null };
    }

    const d = snap.docs[0];
    return { opDocRef: d.ref, operacionDocData: d.data() as Operacion };
  }
}


