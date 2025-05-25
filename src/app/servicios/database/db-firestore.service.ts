import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { addDoc, collection, collectionData, CollectionReference, deleteDoc, doc, docData, DocumentData, Firestore, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { chunk } from 'lodash';
import { firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { Operacion } from 'src/app/interfaces/operacion';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class DbFirestoreService {

  coleccion: string = '';
  componente: string = '';


  constructor(private readonly firestore: Firestore, private firestore2: AngularFirestore) {

  }

/*   getAll(componente:string) {
    let dataCollection = collection(this.firestore, `/Vantruck/datos/${componente}`);
        
    return collectionData(dataCollection, {
      idField: 'id',
    }) as Observable<any[]>;
  } */

    

    ////////////////////////////////////////////////////////////////////////////////////
    getAllColection(coleccion:string) {
      const dataCollection = `/${coleccion}`;
      return this.firestore2.collection(dataCollection, (ref) => ref.where('roles.god', '==', false)).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as any,
        })))
      );
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

    getAllColectionRangeLimit<T>(coleccion:string, range1: any, range2:any,  limite:number) {
      const dataCollection = `/Vantruck/datos/${coleccion}`;
      return this.firestore2.collection(dataCollection, (ref) =>
        ref.orderBy('timestamp', 'desc').where("timestamp", ">=", range1).where("timestamp", "<=", range2).limit(limite)).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    }
   
   
    getAll<T>(componente: string): Observable<ConId<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    }


    getMostRecent<T>(componente: string, field: string): Observable<ConId<any>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref =>
        ref.orderBy(field, 'desc').limit(1) // Ordenar por id descendente y limitar a 1
      ).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    }

    /* getMostRecentId<T>(componente: string, idField: string, campo:string, id:number): Observable<T | undefined> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref =>
        ref.orderBy(idField, 'desc').limit(1) // Ordenar por id descendente y limitar a 1
        .where(campo, "==" ,id)
      ).valueChanges().pipe(
        map(data => data[0]) // Retorna el primer (y único) elemento del array
      );
    } */

    getMostRecentId<T>(componente: string, field: string, campo:string, id:number): Observable<ConId<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref =>
        ref.orderBy(field, 'desc').limit(1) // Ordenar por id descendente y limitar a 1
        .where(campo, "==" ,id)
      ).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    }

    getMostRecentLimit<T>(componente: string, field: string, limit:number): Observable<ConId<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref =>
        ref.orderBy(field, 'desc').limit(limit) // Ordenar por id descendente y limitar a 1        
      ).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    }

    getMostRecentLimitId<T>(componente: string, field: string, campo:string, id:number, limit:number): Observable<ConId<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref =>
        ref.orderBy(field, 'desc').limit(limit) // Ordenar por id descendente y limitar a 1        
        .where(campo, "==" ,id)
      ).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    }
    
    getAllByDateValue<T>(componente:string, campo:string, value1:any, value2:any, orden:any): Observable<ConId<T>[]>{
      // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
      // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
      // orden solo asc o desc
    
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref =>
        ref.orderBy(campo, orden)
        .where(campo, ">=", value1).where(campo, "<=", value2)
      ).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
      }

      getAllByDateValueField<T>(componente:string, campo:string, value1:any, value2:any, field:string, value3:any){
        // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
        // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
        // orden solo asc o desc
      
        const dataCollection = `/Vantruck/datos/${componente}`;
        return this.firestore2.collection<T>(dataCollection, ref =>
          ref.orderBy(campo, 'asc')
          .where(campo, ">=", value1).where(campo, "<=", value2).where(field, "==", value3)
        ).snapshotChanges().pipe(
          map(snapshot => snapshot.map(change => ({
            id: change.payload.doc.id,
            ...change.payload.doc.data() as T,
          })))
        );
        }

    getAllColectionRangeIdValue<T>(componente:string, range1: any, range2:any,  campo:string, filtro:string, valor:number) : Observable<ConId<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref =>
        ref.where(filtro, "==", valor).where(campo, ">=", range1).where(campo, "<=", range2)).snapshotChanges().pipe(
        map(snapshot => snapshot.map(change => ({
          id: change.payload.doc.id,
          ...change.payload.doc.data() as T,
        })))
      );
    }

    getAllStateChanges<T>(componente: string): Observable<ConIdType<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection).stateChanges().pipe(
        map(changes =>
          changes.map(change => ({
            id: change.payload.doc.id,
            ...change.payload.doc.data() as T,
            type: change.type // 'added', 'modified', 'removed'
          } as ConIdType<T> ) )
        )
      );
    }

    getAllStateChangesLimit<T>(componente: string, campo:string, id:number, orden:string, limit:number): Observable<ConIdType<T>[]> {
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
    }

    getAllStateChangesByDate<T>(componente: string, campo:string, orden:any, value1:any, value2:any): Observable<ConIdType<T>[]> {
      const dataCollection = `/Vantruck/datos/${componente}`;
      return this.firestore2.collection<T>(dataCollection, ref =>
        ref.orderBy(campo, orden)
        .where(campo, ">=", value1).where(campo, "<=", value2)).stateChanges().pipe(
        map(changes =>
          changes.map(change => ({
            id: change.payload.doc.id,
            ...change.payload.doc.data() as T,
            type: change.type // 'added', 'modified', 'removed'
          } as ConIdType<T> ) )
        )
      );
    }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GET ALL ORDENADO POR CAMPO Y ORDEN
getAllSorted(componente:string, campo:string, orden:any) {
  // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
  // orden solo asc o desc

  let dataCollection = `/Vantruck/datos/${componente}`;

  return this.firestore2.collection(dataCollection, ref => ref
    .orderBy(campo, orden))
    .valueChanges(({  idField: 'id' })); }

  // this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))
// this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))

getAllSortedLimit(componente:string, campo:string, orden:any, limite:number) {
  // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
  // orden solo asc o desc

  let dataCollection = `/Vantruck/datos/${componente}`;

  return this.firestore2.collection(dataCollection, ref => ref
    .orderBy(campo, orden)
    .limit(limite))
    .valueChanges(({  idField: 'id' }))
    ; }

  // this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))
// this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))

getAllSortedIdLimit(componente:string, campo:string, id:number, campo2:string, orden:any, limite:number) {
  // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
  // orden solo asc o desc

  let dataCollection = `/Vantruck/datos/${componente}`;

  return this.firestore2.collection(dataCollection, ref => ref
    .where(campo, '==', id )
    .orderBy(campo2, orden)
    .limit(limite))
    .valueChanges(({  idField: 'id' }))
    ; }

  // this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))
// this.firestore.collection('Employees', ref => ref.orderBy('name', 'desc'))


getByFieldValue(componente:string, campo:string, value:any){
  // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
  // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
  // orden solo asc o desc

  let dataCollection = `/Vantruck/datos/${componente}`;
  return this.firestore2.collection(dataCollection, ref => ref
    .where(campo, '==', value))
    .valueChanges(({  idField: 'id' })); 
  }

  getByFieldValueLimit(componente: string, campo: string, value: any, limite: number) {
    // Devuelve los docs de la colección que tengan un campo con un valor determinado
    // Campo debe existir en la colección, si está anidado pasar ruta separada por puntos (field.subfield)
    // Orden solo asc o desc
  
    let dataCollection = `/Vantruck/datos/${componente}`;
    return this.firestore2.collection(dataCollection, ref => ref
      .where(campo, '==', value)
      .orderBy('fecha', 'desc')
      .limit(limite))
      .valueChanges({ idField: 'id' });
  }

  getByFieldValueLimitBuscarTarifa(componente: string, campo: string, value: any, limite: number) {
    // Devuelve los docs de la colección que tengan un campo con un valor determinado
    // Campo debe existir en la colección, si está anidado pasar ruta separada por puntos (field.subfield)
    // Orden solo asc o desc
  
    let dataCollection = `/Vantruck/datos/${componente}`;
    return this.firestore2.collection(dataCollection, ref => ref
      .where(campo, '==', value)
      .orderBy('idTarifa', 'desc')
      .limit(limite))
      .valueChanges({ idField: 'id' });
  }

  getByDateValue(componente:string, campo:string, value1:any, value2:any){
    // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
    // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
    // orden solo asc o desc
  
    let dataCollection = `/Vantruck/datos/${componente}`;
    return this.firestore2.collection(dataCollection, ref => ref
      .where(campo, ">=", value1).where(campo, "<=", value2))
      .valueChanges(({  idField: 'id' })); 
    }

  getByDateValueAndFieldValue(componente:string, campo:string, value1:any, value2:any, campo2:string, value3:any){
    // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
    // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
    // orden solo asc o desc
  
    let dataCollection = `/Vantruck/datos/${componente}`;
    return this.firestore2.collection(dataCollection, ref => ref
      .where(campo, ">=", value1).where(campo, "<=", value2).where(campo2, '==', value3))
      .valueChanges(({  idField: 'id' })); 
    }

    getByDoubleValue(componente:string, campo1:string, campo2:string, value1:any, orden:any) {
      // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
      // orden solo asc o desc
    
      let dataCollection = `/Vantruck/datos/${componente}`;
    
      return this.firestore2.collection(dataCollection, ref => ref
        .where(campo1, "==", value1).orderBy(campo2, orden))
        .valueChanges(({  idField: 'id' })); 
      }
     // Método para verificar si existen tarifas para un idChofer específico
      existeTarifa(componente:string, id: number, campo:string): Observable<boolean> {
        let dataCollection = `/Vantruck/datos/${componente}`;
        return this.firestore2.collection(dataCollection, ref => ref.where(campo, '==', id))
          .snapshotChanges()
          .pipe(
            map(actions => {
              return actions.length > 0;
            })
          );
      }

      // Método para obtener una tarifa específica
      obtenerTarifaIdTarifa(componente:string, id: number, campo:string): Observable<any | null> {
        let dataCollection = `/Vantruck/datos/${componente}`;
        return this.firestore2.collection(dataCollection, ref => ref
          .where(campo, '==', id))
          .snapshotChanges()
          .pipe(
            map(actions => {
              if (actions.length === 0) {
                return null;
              } else {
                const data = actions[0].payload.doc.data() as any;
                data.id = actions[0].payload.doc.id;
                return data;
              }
            })
          );
      }

      obtenerTarifaMasReciente(componente:string, id: number, campo:string, orden:string): Observable<any | null> {
        let dataCollection = `/Vantruck/datos/${componente}`;
        return this.firestore2.collection(dataCollection, ref => ref
          .where(campo, '==', id)
          .orderBy(orden, 'desc')
          .limit(1))
          .snapshotChanges()
          .pipe(
            map(actions => {
              if (actions.length === 0) {
                return null;
              } else {
                const data = actions[0].payload.doc.data() as any;
                data.id = actions[0].payload.doc.id;
                return data;
              }
            })
          );
      }
      
      obtenerElementoMasReciente(componente:string, orden:string, limite:number): Observable<any | null> {
        let dataCollection = `/Vantruck/datos/${componente}`;
        return this.firestore2.collection(dataCollection, ref => ref          
          .orderBy(orden, 'desc')
          .limit(limite))
          .snapshotChanges()
          .pipe(
            map(actions => {
              if (actions.length === 0) {
                return null;
              } else {
                const data = actions[0].payload.doc.data() as any;
                data.id = actions[0].payload.doc.id;
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

  createTarifasEspClientes(componente:string, item: any) {
    //console.log("db.service, metodo create: ",this.coleccion);
    
    let dataCollection = collection(this.firestore, `/Vantruck/datos/tarifasEspCliente/${componente}`);
    return addDoc(dataCollection, item).then(() =>
      console.log('Create. Escritura en la base de datos en: tarifasEspCliente/', componente)
    );
  }

  async guardarFacturasOp(compCliente:string, infOpCliente: FacturaOp, compChofer: string, infOpChofer: FacturaOp, op: ConId<Operacion>): Promise<{ exito: boolean; mensaje: string }> {        
    const batch = writeBatch(this.firestore);    
    try {
      // Verificar que no exista informe de operación para cliente
      const refCliente = collection(this.firestore, `/Vantruck/datos/${compCliente}`);
      const qCliente = query(refCliente, where('idFacturaOp', '==', infOpCliente.idFacturaOp));
      const snapCliente = await getDocs(qCliente);
      if (!snapCliente.empty) {
        throw new Error(`Ya existe un informe para el cliente con idFacturaOp ${infOpCliente.idFacturaOp}`);
      }
  
      // Verificar que no exista informe de operación para chofer
      const refChofer = collection(this.firestore, `/Vantruck/datos/${compChofer}`);
      const qChofer = query(refChofer, where('idFacturaOp', '==', infOpChofer.idFacturaOp));
      const snapChofer = await getDocs(qChofer);
      if (!snapChofer.empty) {
        throw new Error(`Ya existe un informe para el chofer con idFacturaOp ${infOpChofer.idFacturaOp}`);
      }
  
      // Verificar que exista la operación
      const opRef = collection(this.firestore, `/Vantruck/datos/operaciones`);
      const qOp = query(opRef, where('idOperacion', '==', op.idOperacion));
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

  getUsuarioUid(id:string) {
    const estacionamiento1DocumentReference = doc(this.firestore, `/users/${id}`);    
    return docData(estacionamiento1DocumentReference, { idField: 'id' });
  }

  setearColeccion(coleccion:string) {
    this.coleccion = coleccion;
    console.log("esto es el servicio db. coleccion: ", this.coleccion);
    
  }

  getTodo(){
    let dataCollection = collection(this.firestore, `/datos/`);
    
    return collectionData(dataCollection, {
      idField: 'id',
    }) as Observable<any[]>
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
        nuevoEstado.facturada = nuevoEstado.facCliente && nuevoEstado.facChofer;

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

    async actualizarMultiple(
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

}
