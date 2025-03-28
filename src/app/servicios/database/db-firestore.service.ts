import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { addDoc, collection, collectionData, CollectionReference, deleteDoc, doc, docData, DocumentData, Firestore, updateDoc } from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { FacturaOp } from 'src/app/interfaces/factura-op';

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
    
    getAllByDateValue<T>(componente:string, campo:string, value1:any, value2:any, orden:any){
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
    //console.log("db.service, metodo create: ",this.coleccion);
    
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

  async guardarFacturaOp(componente:string, facturaOp: FacturaOp) {
    try {
        // Verificar si ya existe una factura con el mismo idOperacion
        const query = this.firestore2.collection(`/Vantruck/datos/${componente}`, ref =>
            ref.where('idOperacion', '==', facturaOp.idOperacion)
        ).get();

        const querySnapshot = await firstValueFrom(query); // Convertir el observable en una promesa

        if (!querySnapshot.empty) {
            // Si ya existe una factura con el mismo idOperacion
            console.error("Ya existe una factura con el mismo idOperacion:", facturaOp.idOperacion);
            throw new Error("Ya existe una factura con el mismo idOperacion.");
        } else {
            // Si no existe, guardar la nueva factura
            await this.firestore2.collection(`/Vantruck/datos/${componente}`).add(facturaOp);
            console.log("Factura guardada correctamente.");
        }
    } catch (error) {
        console.error("Error al guardar la factura:", error);
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
}
