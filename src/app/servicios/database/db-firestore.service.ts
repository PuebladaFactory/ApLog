import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { addDoc, collection, collectionData, CollectionReference, deleteDoc, doc, docData, DocumentData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class DbFirestoreService {

  coleccion: string = '';
  componente: string = '';


  constructor(private readonly firestore: Firestore, private firestore2: AngularFirestore) {

  }

  getAll(componente:string) {
    let dataCollection = collection(this.firestore, `/Vantruck/datos/${componente}`);
        
    return collectionData(dataCollection, {
      idField: 'id',
    }) as Observable<any[]>;
  }


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


getByFieldValue(componente:string, campo:string, value:any){
  // devuelve los docs  de la coleccion que tengan un campo con un valor determinado
  // campo debe existir en la coleccion, si esta anidado pasar ruta separada por puntso (field.subfield)
  // orden solo asc o desc

  let dataCollection = `/Vantruck/datos/${componente}`;
  return this.firestore2.collection(dataCollection, ref => ref
    .where(campo, '==', value))
    .valueChanges(({  idField: 'id' })); 
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

  update(componente: string, item: any) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(
      this.firestore,
      `/Vantruck/datos/${componente}/${item.id}`
    );
    return updateDoc(estacionamiento1DocumentReference, { ...item });
  }

  delete(componente:string, id: string) {
    //this.dataCollection = collection(this.firestore, `/estacionamiento/datos/${componente}`);
    const estacionamiento1DocumentReference = doc(this.firestore, `/Vantruck/datos/${componente}/${id}`);
    return deleteDoc(estacionamiento1DocumentReference);
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
}
