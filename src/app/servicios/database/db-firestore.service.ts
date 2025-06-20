import { Injectable } from '@angular/core';
/* import { AngularFirestore } from '@angular/fire/compat/firestore'; */
import { addDoc, collection, collectionData, CollectionReference, deleteDoc, doc, docData, DocumentData, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { chunk } from 'lodash';
import { firstValueFrom, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Operacion } from 'src/app/interfaces/operacion';
import Swal from 'sweetalert2';
import { Firestore } from '@angular/fire/firestore';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DbFirestoreService {

  coleccion: string = '';
  componente: string = '';
  private firestore = inject(Firestore);

  constructor() {

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

  async guardarFacturasOp(compCliente:string, infOpCliente: FacturaOp, compChofer: string, infOpChofer: FacturaOp, op: ConId<Operacion>): Promise<{ exito: boolean; mensaje: string }> {        
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
  informesSeleccionados: ConId<FacturaOp>[],
  modo: string,
  componenteAlta: string,
  componenteBaja: string,
  factura: any,
  componenteFactura: string
): Promise<{ exito: boolean; mensaje: string }> {
  const colOps = 'operaciones';
  const bloques = chunk(informesSeleccionados, 500);
  const reversionData: { docRef: ReturnType<typeof doc>, prevData: any }[] = [];
  const informesBackup: ConId<FacturaOp>[] = [...informesSeleccionados]; // Backup en memoria  
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
        if (modo === 'clientes') {
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
      }

      // 7. Ejecutar batch
      await batch.commit();
      console.log(`Batch ${i + 1} procesado correctamente.`);
    }

    // 8. Verificar existencia de factura duplicada
    const facturasRef = collection(this.firestore, `/Vantruck/datos/${componenteFactura}`);
    const idFactura = modo === 'clientes' ? factura.idFacturaCliente
                   : modo === 'choferes' ? factura.idFacturaChofer
                   : factura.idFacturaProveedor;

    const facturaQuery = query(facturasRef, where('idFactura', '==', idFactura));
    const facturaSnap = await getDocs(facturaQuery);
    if (!facturaSnap.empty) {
      throw new Error(`Ya existe una factura con idFactura ${idFactura} en ${componenteFactura}`);
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
  informesSeleccionados: ConIdType<FacturaOp>[],
  modo: string,
  componenteInformes: string,  
  contraParteColeccion: string,
  factura: any,
  componenteProforma: string
): Promise<{ exito: boolean; mensaje: string }> {
  const colOps = 'operaciones';
  const bloques = chunk(informesSeleccionados, 500);
  const reversionData: { docRef: ReturnType<typeof doc>, prevData: any }[] = [];
  const informesBackup: ConId<FacturaOp>[] = [...informesSeleccionados]; // Backup en memoria  
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
        if (modo === 'clientes') {
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
        if (modo !== 'clientes') {
          const contraParteRef = collection(this.firestore, `/Vantruck/datos/${contraParteColeccion}`);
          const contraParteQuery = query(contraParteRef, where('idOperacion', '==', informe.idOperacion));
          const contraParteSnap = await getDocs(contraParteQuery);

          if (!contraParteSnap.empty) {
            const contraDoc = contraParteSnap.docs[0];
            const contraRef = contraDoc.ref;
            batch.update(contraRef, { contraParteProforma: true });
          } else {
            console.warn(`No se encontró contra parte con idOperacion ${informe.idOperacion} en ${contraParteColeccion}`);
          }
        }
        
      }

      // 7. Ejecutar batch
      await batch.commit();
      console.log(`Batch ${i + 1} procesado correctamente.`);
    }

    // 8. Verificar existencia de factura duplicada
    const facturasRef = collection(this.firestore, `/Vantruck/datos/${componenteProforma}`);
    const idFactura = modo === 'clientes' ? factura.idFacturaCliente
                   : modo === 'choferes' ? factura.idFacturaChofer
                   : factura.idFacturaProveedor;

    const facturaQuery = query(facturasRef, where('idFactura', '==', idFactura));
    const facturaSnap = await getDocs(facturaQuery);
    if (!facturaSnap.empty) {
      throw new Error(`Ya existe una factura con idFactura ${idFactura} en ${componenteProforma}`);
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
  informesSeleccionados: ConIdType<FacturaOp>[],
  modo: string,
  componenteInformes: string,
  
  factura: any,
  componenteProforma: string
): Promise<{ exito: boolean; mensaje: string }> {
  const colOps = 'operaciones';
  const bloques = chunk(informesSeleccionados, 500);
  const reversionData: { docRef: ReturnType<typeof doc>, prevData: any }[] = [];
  const informesBackup: ConId<FacturaOp>[] = [...informesSeleccionados]; // Backup en memoria  
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
        if (modo !== 'clientes') {
          const contraParteRef = collection(this.firestore, `/Vantruck/datos/facturaOpCliente`);
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


}
