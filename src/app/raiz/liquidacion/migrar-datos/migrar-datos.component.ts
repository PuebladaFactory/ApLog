import { Component, Pipe, PipeTransform } from '@angular/core';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { collection, Firestore, getDocs, query, where, writeBatch, doc } from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { EntidadLiq, InformeLiq } from 'src/app/interfaces/informe-liq';


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
  datosOrigen: FacturaOp[] = [];
  infOrigen: any[] = [];
  datosTransformados: InformeOp[] = [];
  facturasOpDuplicadas: FacturaOp[] = [];
  facturasDuplicadas: any[] = [];
  infLiqTransformados: InformeLiq[] = [];

  cargando: boolean = false;
  filtroOrigen:string = "";
  filtroDestino:string = "";
  filtroDduplicados:string= "";

  informesOpToogle:boolean = true;
  
  constructor(
    private firestore: Firestore,
    private dbFirebase: DbFirestoreService,
  ) {}

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
    this.datosOrigen = snapshot.docs.map(doc => doc.data() as FacturaOp);
    console.log("datosOrigen: ", this.datosOrigen);
    
  }

  transformarDatos() {
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
    
  }

async guardarTransformados() {
  
  if (!this.datosTransformados.length || !this.coleccionDestino) {
    Swal.fire('Error', 'No hay datos transformados para guardar.', 'error');
    return;
  }

  this.cargando = true;

  try {
    const loteTamaño = 500;
    const totalDocs = this.datosTransformados.length;
    const cantidadLotes = Math.ceil(totalDocs / loteTamaño);

    for (let i = 0; i < cantidadLotes; i++) {
      const loteDocs = this.datosTransformados.slice(i * loteTamaño, (i + 1) * loteTamaño);
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


  verificarDuplicados() {
      this.facturasOpDuplicadas=[]
    const seenIds = new Set<number>();

    this.datosOrigen = this.datosOrigen.filter((factura:FacturaOp) => {
        if (seenIds.has(factura.idOperacion)) {
            this.facturasOpDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idOperacion);
            return true; // Mantener en el array original
        }
    });    
    console.log("datosOrigen", this.datosOrigen);
    console.log("duplicadas", this.facturasOpDuplicadas);
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
    this.dbFirebase.eliminarMultiple(this.facturasOpDuplicadas, this.coleccionOrigen).then((result)=>{
      this.cargando = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }


  transformarInformesLiq() {
    /* this.infLiqTransformados = this.infOrigen.map((data: any): InformeLiq => {
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
        descuentos: data.descuentos || [],
        columnas: data.columnas || [],
        estado: 'emitido',
        cobrado: data.cobrado || false,
        formaPago: '',
        fechaCobro: '',
        observaciones: '',
        facturaVinculada: ''
      };
    }); */
    this.infLiqTransformados = this.infOrigen
    console.log("this.infLiqTransformados", this.infLiqTransformados);
    
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

}
