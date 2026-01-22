import { Component, Pipe, PipeTransform } from '@angular/core';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { collection, Firestore, getDocs, query, where, writeBatch, doc } from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { EntidadLiq, InformeLiq } from 'src/app/interfaces/informe-liq';
import { Operacion } from 'src/app/interfaces/operacion';
import { Cliente } from 'src/app/interfaces/cliente';


export interface FacturaOp {

    idFacturaOp: number;    
    idOperacion: number
    fecha: string | Date;        
    idCliente: number;
    idChofer: number;
    idProveedor: number;
    idTarifa:number;
    valores: Valores;    
    km: number;    
    liquidacion: boolean;
    contraParteMonto: number;
    contraParteId: number;
    tarifaTipo: TarifaTipo;
    observaciones: string;
    hojaRuta: string;
    patente: string;
    proforma: boolean;
    contraParteProforma: boolean;

}

export interface Valores{
    tarifaBase: number;
    acompaniante: number;
    kmMonto: number;
    total: number;
}

@Pipe({ name: 'filterBy' })
export class FilterByPipe implements PipeTransform {
  transform(items: any[], filtro: string): any[] {
    if (!filtro || !items) return items;
    filtro = filtro.toLowerCase();
    return items.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(filtro)
      )
    );
  }
}

@Component({
  selector: 'app-migrar-datos',
  standalone:false,
  templateUrl: './migrar-datos.component.html',
  styleUrl: './migrar-datos.component.scss'
})
export class MigrarDatosComponent {

   // Fecha desde y hasta
  fechaDesde: string = '';
  fechaHasta: string = '';

  // Colecciones de origen y destino
  coleccionOrigen: string = 'facturaOpCliente';
  coleccionDestino: string = 'informesOpClientes';

  // Datos cargados
  datosOrigen: InformeOp[] = [];
  infOrigen: any[] = [];
  datosTransformados: InformeOp[] = [];
  informesOpDuplicadas: InformeOp[] = [];
  facturasDuplicadas: any[] = [];
  infLiqTransformados: InformeLiq[] = [];

  cargando: boolean = false;
  filtroOrigen:string = "";
  filtroDestino:string = "";
  filtroDduplicados:string= "";
  filtroError:string = "";

  informesOpToogle:boolean = true;
  informesLiqToogle:boolean = false;
  opToogle:boolean = false;
  docuNuevaColeccion: any[] = [];
  operaciones: Operacion[] = [];
  idsOp: number[] = [];
  infOpLiq: InformeOp[] = [];
  opErrores: Operacion[] = [];
  infOpErrores: InformeOp[] = [];
  backupToogle:boolean = false;
  datosBackUp:any[] = []

  
  constructor(
    private firestore: Firestore,
    private dbFirebase: DbFirestoreService,
  ) {}

  informesToogle(valor:string){
    switch(valor){
      case "a":
        this.informesOpToogle = true;
        this.informesLiqToogle = false;
        this.opToogle = false;
        this.backupToogle = false;
        break;
      case "b":
        this.informesOpToogle = false;
        this.informesLiqToogle = true;
        this.opToogle = false;
        this.backupToogle = false;
        break;
      case "c":
        this.informesOpToogle = false;
        this.informesLiqToogle = false;
        this.opToogle = true;
        this.backupToogle = false;
        break;

      case "d":
        this.informesOpToogle = false;
        this.informesLiqToogle = false;
        this.opToogle = false;
        this.backupToogle = true;
        break;
      default:
        this.mensajesError("error en el botón de swicth")
        break;
    }
  }

  async cargarDatos() {
    if (!this.fechaDesde || !this.fechaHasta || !this.coleccionOrigen) {
      Swal.fire('Error', 'Completá todos los campos.', 'error');
      return;      
    }
    this.datosOrigen = [];
    console.log("fechaDesde?: ", this.fechaDesde, " hasta?: ", this.fechaHasta, " coleccion: ",this.coleccionOrigen );
    
    const fechaIni = new Date(this.fechaDesde);
    const fechaFin = new Date(this.fechaHasta);    

    const ref = collection(this.firestore, `/Vantruck/datos/${this.coleccionOrigen}`);
    const q = query(ref, where('fecha', '>=', fechaIni.toISOString()), where('fecha', '<=', fechaFin.toISOString()));

    const snapshot = await getDocs(q);
    this.datosOrigen = snapshot.docs.map(doc => doc.data() as InformeOp);
    console.log("datosOrigen: ", this.datosOrigen);
    
  }

/*   transformarDatos() {
    if (!this.datosOrigen.length) {
      Swal.fire('Error', 'No hay datos para transformar.', 'error');
      return;    
    }
    this.datosTransformados = [];

    this.datosTransformados = this.datosOrigen.map((facturaOp): InformeOp => ({
      idInfOp: facturaOp.idFacturaOp,
      idOperacion: facturaOp.idOperacion,
      fecha: facturaOp.fecha,
      idCliente: facturaOp.idCliente,
      idChofer: facturaOp.idChofer,
      idProveedor: facturaOp.idProveedor,
      idTarifa: facturaOp.idTarifa,
      valores: facturaOp.valores,
      km: facturaOp.km,
      liquidacion: facturaOp.liquidacion,
      contraParteMonto: facturaOp.contraParteMonto,
      contraParteId: facturaOp.contraParteId,
      tarifaTipo: facturaOp.tarifaTipo,
      observaciones: facturaOp.observaciones,
      hojaRuta: facturaOp.hojaRuta,
      patente: facturaOp.patente,
      proforma: facturaOp.proforma ?? false,
      contraParteProforma: facturaOp.contraParteProforma ?? false,     

    }));
    console.log("datosTransformados: ", this.datosTransformados);
    
  } */

async guardarTransformados() {
  if (!this.datosTransformados.length || !this.coleccionDestino) {
    Swal.fire('Error', 'No hay datos transformados para guardar.', 'error');
    return;
  }

  this.cargando = true;
  let omitidos: number[] = [];

  try {
    const loteTamaño = 500;
    const totalDocs = this.datosTransformados.length;
    const cantidadLotes = Math.ceil(totalDocs / loteTamaño);

    for (let i = 0; i < cantidadLotes; i++) {
      const loteDocs = this.datosTransformados.slice(i * loteTamaño, (i + 1) * loteTamaño);
      const batch = writeBatch(this.firestore);
      let docsAgregados = 0;

      for (const info of loteDocs) {
        const colRef = collection(this.firestore, `/Vantruck/datos/${this.coleccionDestino}`);
        const q = query(colRef, where('idOperacion', '==', info.idOperacion));
        const snap = await getDocs(q);

        if (!snap.empty) {
          omitidos.push(info.idOperacion); // guardamos los omitidos para mostrar al final
          continue;
        }

        const ref = doc(colRef); // Firestore genera ID automáticamente
        batch.set(ref, info);
        docsAgregados++;
      }

      if (docsAgregados > 0) {
        await batch.commit();
      }
    }

    let mensaje = 'Los informes fueron guardados correctamente.';
    if (omitidos.length > 0) {
      mensaje += `\nSe omitieron ${omitidos.length} informes ya existentes:\n${omitidos.join(', ')}`;
    }

    Swal.fire('Éxito', mensaje, 'success');
  } catch (err) {
    console.error(err);
    Swal.fire('Error', 'Falló la operación de guardado.', 'error');
  } finally {
    this.cargando = false;
  }
}


  verificarDuplicados() {
      this.informesOpDuplicadas=[]
    const seenIds = new Set<number>();

    this.datosOrigen = this.datosOrigen.filter((factura:InformeOp) => {
        if (seenIds.has(factura.idOperacion)) {
            this.informesOpDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idOperacion);
            return true; // Mantener en el array original
        }
    });    
    console.log("datosOrigen", this.datosOrigen);
    console.log("duplicadas", this.informesOpDuplicadas);
    //this.verificarDuplicadosFacturadas()
  }

  verificarFacturasDuplicados() {
    this.facturasDuplicadas=[]
    const seenIds = new Set<number>();

    this.infOrigen = this.infOrigen.filter((factura:any) => {
        if (seenIds.has(factura.idFacturaProveedor)) {
            this.facturasDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idFacturaProveedor);
            return true; // Mantener en el array original
        }
    });    
    console.log("datosOrigen", this.infOrigen);
    console.log("duplicadas", this.facturasDuplicadas);
    //this.verificarDuplicadosFacturadas()
  }

  eliminarObjeto(){
    this.cargando = true
    this.dbFirebase.eliminarMultiple(this.informesOpDuplicadas, this.coleccionOrigen).then((result)=>{
      this.cargando = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }


  transformarInformesLiq() {
    this.infLiqTransformados = this.infOrigen.map((data: any): InformeLiq => {
      let tipo: 'cliente' | 'chofer' | 'proveedor';
      let entidad: EntidadLiq;
      let totalContraParte = 0;

      if ('idCliente' in data) {
        tipo = 'cliente';
        entidad = {
          id: data.idCliente,
          razonSocial: data.razonSocial,
          cuit: 0
        };
        totalContraParte = data.montoFacturaChofer || 0;
      } else if ('idChofer' in data) {
        tipo = 'chofer';
        entidad = {
          id: data.idChofer,
          razonSocial: `${data.apellido} ${data.nombre}`,
          cuit: 0
        };
        totalContraParte = data.montoFacturaCliente || 0;
      } else {
        tipo = 'proveedor';
        entidad = {
          id: data.idProveedor,
          razonSocial: data.razonSocial,
          cuit: 0
        };
        totalContraParte = data.montoFacturaCliente || 0;
      }

      const valores  = {
        totalTarifaBase: data.valores?.totalTarifaBase || 0,
        totalAcompaniante: data.valores?.totalAcompaniante || 0,
        totalkmMonto: data.valores?.totalkmMonto || 0,
        descuentoTotal: data.valores?.descuentoTotal || 0,
        total: data.valores?.total || 0,
        totalContraParte
      };

      return {
        idInfLiq: data.idFacturaCliente || data.idFacturaChofer || data.idFacturaProveedor,
        numeroInterno: '',
        tipo,
        fecha: data.fecha,
        entidad,
        operaciones: data.operaciones || [],
        valores,
        valoresFinancieros: {
          total: valores.total,
          totalCobrado: 0,
          saldo: valores.total,
          
        },
        descuentos: data.descuentos || [],
        columnas: data.columnas || [],
        estado: 'emitido',
        estadoFinanciero: 'pendiente',
        cobrado: data.cobrado || false,
        formaPago: '',
        fechaCobro: '',
        observaciones: '',
        facturaUrl: ''
      };
    });
    console.log("this.infLiqTransformados", this.infLiqTransformados);
/*     this.infLiqTransformados = this.infOrigen
    console.log("this.infLiqTransformados", this.infLiqTransformados); */
    
  }

  async cargarFacturasOrigen() {
    if (!this.fechaDesde || !this.fechaHasta || !this.coleccionOrigen) return;

    this.cargando = true;
    try {
      const colRef = collection(this.firestore, `/Vantruck/datos/${this.coleccionOrigen}`);
      const snapshot = await getDocs(colRef);

      const desde = new Date(this.fechaDesde);
      const hasta = new Date(this.fechaHasta);

      this.infOrigen = snapshot.docs
        .map(doc => doc.data())
        .filter((data: any) => {
          const fecha = new Date(data.fecha);
          return fecha >= desde && fecha <= hasta;
        });
      console.log("infOrigen", this.infOrigen)
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Swal.fire('Error', 'Error al cargar los datos de origen.', 'error');
    } finally {
      this.cargando = false;
    }
  }

  async guardarInLiqTransformados() {
  
    if (!this.infLiqTransformados.length || !this.coleccionDestino) {
      Swal.fire('Error', 'No hay datos transformados para guardar.', 'error');
      return;
    }

    this.cargando = true;

    try {
      const loteTamaño = 500;
      const totalDocs = this.infLiqTransformados.length;
      const cantidadLotes = Math.ceil(totalDocs / loteTamaño);

      for (let i = 0; i < cantidadLotes; i++) {
        const loteDocs = this.infLiqTransformados.slice(i * loteTamaño, (i + 1) * loteTamaño);
        const batch = writeBatch(this.firestore);

        for (const info of loteDocs) {
          // Firestore generará el ID automáticamente
          const ref = doc(collection(this.firestore, `/Vantruck/datos/${this.coleccionDestino}`));
          batch.set(ref, info);
        }

        await batch.commit(); // se espera cada lote antes de pasar al siguiente
      }

      Swal.fire('Éxito', 'Los informes fueron guardados correctamente.', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Falló la operación de guardado.', 'error');
    } finally {
      this.cargando = false;
    }
  }

  private convertirFacturaChoferAInformeLiq(data: any): InformeLiq {
  return {
    idInfLiq: data.idFacturaChofer || 0,
    numeroInterno: '', // quedará vacío como paso intermedio
    tipo: 'chofer',
    fecha: data.fecha || '',
    entidad: {
      id: data.idChofer || 0,
      razonSocial: `${data.apellido || ''} ${data.nombre || ''}`,
      cuit: 0
    },
    operaciones: data.operaciones || [],
    valores: {
      totalTarifaBase: data.valores?.totalTarifaBase || 0,
      totalAcompaniante: data.valores?.totalAcompaniante || 0,
      totalkmMonto: data.valores?.totalkmMonto || 0,
      descuentoTotal: data.valores?.descuentoTotal || 0,
      total: data.valores?.total || 0,
      totalContraParte: data.montoFacturaCliente || 0
    },
    valoresFinancieros: {
      total: data.valores?.total,
      totalCobrado: 0,
      saldo: data.valores?.total,
      
    },
    descuentos: data.descuentos || [],
    columnas: data.columnas || [],
    estado: 'emitido',
    estadoFinanciero: 'pendiente',
    cobrado: data.cobrado || false,
    formaPago: '',
    fechaCobro: '',
    observaciones: '',
    facturaUrl: ''
  };
}

async migrarProformasAInformeLiq() {
  const colRef = collection(this.firestore, '/Vantruck/datos/proforma');

  try {
    const snapshot = await getDocs(colRef);
    const documentos = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));

    if (!documentos.length) {
      Swal.fire('Sin datos', 'No hay proformas para migrar.', 'info');
      return;
    }

    this.cargando = true;
    const batch = writeBatch(this.firestore);

    for (const { id, data } of documentos) {
      const nuevoInforme = this.convertirFacturaChoferAInformeLiq(data);
      const ref = doc(this.firestore, `/Vantruck/datos/proforma/${id}`);
      batch.set(ref, nuevoInforme); // sobrescribe completamente
    }

    await batch.commit();
    Swal.fire('Éxito', 'Las proformas fueron convertidas correctamente.', 'success');
  } catch (error) {
    console.error('Error al migrar proformas:', error);
    Swal.fire('Error', 'Ocurrió un error durante la migración de proformas.', 'error');
  } finally {
    this.cargando = false;
  }
}

async consultarNuevaColeccion(){
    if (!this.fechaDesde || !this.fechaHasta || !this.coleccionOrigen) return;
    this.docuNuevaColeccion = [];
    this.cargando = true;
    try {
      const colRef = collection(this.firestore, `/Vantruck/datos/${this.coleccionDestino}`);
      const snapshot = await getDocs(colRef);

      const desde = new Date(this.fechaDesde);
      const hasta = new Date(this.fechaHasta);

      this.docuNuevaColeccion = snapshot.docs
        .map(doc => doc.data())
        .filter((data: any) => {
          const fecha = new Date(data.fecha);
          return fecha >= desde && fecha <= hasta;
        });
      console.log("docuNuevaColeccion", this.docuNuevaColeccion)
    } catch (error) {
      console.error('Error al cargar datos:', error);
      Swal.fire('Error', 'Error al cargar los datos de origen.', 'error');
    } finally {
      this.cargando = false;
    }
}

  mensajesError(msj:string){
    Swal.fire({
      icon: 'error',
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }

  ////////////////////////OPERACIONES/////////////////
    async cargarOp() {
    if (!this.fechaDesde || !this.fechaHasta || !this.coleccionOrigen || !this.coleccionDestino) {
      Swal.fire('Error', 'Completá todos los campos.', 'error');
      return;      
    }
    this.operaciones = [];
    this.opErrores = [];
    console.log("fechaDesde?: ", this.fechaDesde, " hasta?: ", this.fechaHasta, " coleccion: ",this.coleccionOrigen );
    
    const fechaIni = new Date(this.fechaDesde);
    const fechaFin = new Date(this.fechaHasta);    

    const ref = collection(this.firestore, `/Vantruck/datos/${this.coleccionOrigen}`);
    const q = query(ref, where('fecha', '>=', fechaIni.toISOString()), where('fecha', '<=', fechaFin.toISOString()));

    const snapshot = await getDocs(q);
    this.operaciones = snapshot.docs.map(doc => doc.data() as Operacion);
    console.log("operaciones: ", this.operaciones);
    this.operaciones.forEach((op: Operacion) => {                
      this.idsOp.push(op.idOperacion)
    });
    this.consultarInfOp()
  }

  async consultarInfOp(){
    this.infOpLiq = [];
    this.cargando = true;        
        try {
          const consulta = await this.dbFirebase.obtenerDocsPorIdsOperacion(       
            this.coleccionDestino,         // nombre de la colección
            this.idsOp       // array de idsOperacion
          );
          console.log("consulta", consulta);
          
    
          this.infOpLiq = consulta.encontrados;
    
          if (consulta.idsFaltantes.length) {
            Swal.fire({
              icon: 'warning',
              title: 'Atención',
              text: `Se encontraron ${consulta.encontrados.length} informes, pero faltan ${consulta.idsFaltantes.length}.`,
              footer: `IDs faltantes: ${consulta.idsFaltantes.join(', ')}`
            });
          } else {
            //Swal.fire('Éxito', 'Se encontraron todas las operaciones.', 'success');
          }
    
        } catch (error) {
          console.error("'Error al consultar por los informes", error);
          Swal.fire('Error', 'Falló la consulta de los informes.', 'error');
        } finally {
          this.cargando = false;
        }

  }

  verificarValores(){
    let respuesta = this.verificarConsistenciaValores();
    this.opErrores = respuesta.operacionesInconsistentes;
    console.log("this.opErrores", this.opErrores);
    
    this.infOpErrores = respuesta.informesInconsistentes;
    console.log("this.infOpErrores", this.infOpErrores);

  }


verificarConsistenciaValores(
  /* operaciones: Operacion[],
  infOpLiq: InformeOp[],
  coleccionDestino: string */
): { operacionesInconsistentes: Operacion[], informesInconsistentes: InformeOp[] } {

  const operacionesInconsistentes: Operacion[] = [];
  const informesInconsistentes: InformeOp[] = [];

  for (const op of this.operaciones) {
    // Buscar el informe correspondiente por idOperacion
    const informe = this.infOpLiq.find(i => i.idOperacion === op.idOperacion);

    // Si no hay informe, simplemente continuar (sin agregar a ningún array)
    if (!informe) continue;

    // Determinar qué valores comparar
    const valoresOp:any = this.coleccionDestino === 'infOpLiqClientes' ? op.valores.cliente : op.valores.chofer;

    const coincide =
      valoresOp.acompValor === informe.valores.acompaniante &&
      valoresOp.kmAdicional === informe.valores.kmMonto &&
      valoresOp.tarifaBase === informe.valores.tarifaBase &&
      (
        (this.coleccionDestino === 'infOpLiqClientes' && valoresOp.aCobrar === informe.valores.total) ||
        (this.coleccionDestino !== 'infOpLiqClientes' && valoresOp.aPagar === informe.valores.total)
      );

    if (!coincide) {
      operacionesInconsistentes.push(op);
      informesInconsistentes.push(informe);
    }
  }

  return { operacionesInconsistentes, informesInconsistentes };
}

  descargarComoJSON() {
    const jsonStr = JSON.stringify(this.datosBackUp, null, 2); // 'null, 2' para formato legible
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.coleccionOrigen}.json`;
    a.click();

    window.URL.revokeObjectURL(url); // Limpieza
  }

  cargarOperacionesDesdeArchivo(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e: any) => {
    const contenido = e.target.result;
    const clientes: Cliente[] = JSON.parse(contenido);
    this.datosBackUp = clientes;
    
    console.log(`this.datosBackUp: ${this.coleccionOrigen} cargado:`, this.datosBackUp);

    // ahora podés trabajar con ellas
    //this.probarErroresConOperaciones(operaciones);
  };
  reader.readAsText(file);
}

  async cargarDatosCompletos() {
   /*  if (!this.fechaDesde || !this.fechaHasta || !this.coleccionOrigen) {
      Swal.fire('Error', 'Completá todos los campos.', 'error');
      return;      
    } */
    this.datosBackUp = [];
    console.log("fechaDesde?: ", this.fechaDesde, " hasta?: ", this.fechaHasta, " coleccion: ",this.coleccionOrigen );
    
    const fechaIni = new Date(this.fechaDesde);
    const fechaFin = new Date(this.fechaHasta);    

    const ref = collection(this.firestore, `/Vantruck/datos/${this.coleccionOrigen}`);
    const q = query(ref);

    const snapshot = await getDocs(q);
    this.datosBackUp = snapshot.docs.map(doc => doc.data() as any);
    console.log("datosOrigen: ", this.datosBackUp);
    
  }

    async cargarDatosPorFecha() {
    if (!this.fechaDesde || !this.fechaHasta || !this.coleccionOrigen) {
      Swal.fire('Error', 'Completá todos los campos.', 'error');
      return;      
    }
    this.datosBackUp = [];
    console.log("fechaDesde?: ", this.fechaDesde, " hasta?: ", this.fechaHasta, " coleccion: ",this.coleccionOrigen );
    
    const fechaIni = new Date(this.fechaDesde);
    const fechaFin = new Date(this.fechaHasta);    

    const ref = collection(this.firestore, `/Vantruck/datos/${this.coleccionOrigen}`);
    const q = query(ref, where('fecha', '>=', fechaIni.toISOString()), where('fecha', '<=', fechaFin.toISOString()));

    const snapshot = await getDocs(q);
    this.datosBackUp = snapshot.docs.map(doc => doc.data() as any);
    console.log("datosOrigen: ", this.datosBackUp);
    
  }

  async guardarObjeto(){
    this.cargando = true;
    const respuesta = await this.dbFirebase.guardarMultipleOtraColeccion(this.datosBackUp, this.coleccionOrigen);
    if(respuesta.exito){
      console.log("respuesta: ", respuesta.mensaje);
      
      this.cargando = false;
      Swal.fire({
          icon: 'success',
          title: 'Atención',
          text: `Se guardaron todos los objetos en ${this.coleccionOrigen}`,          
        });
    } else {
      console.log("respuesta: ", respuesta.mensaje);
      this.cargando = false;
      Swal.fire({
          icon: 'error',
          title: 'Atención',
          text: `Error al guardar los objetos en ${this.coleccionOrigen}`,          
        });
    }
  }


}
