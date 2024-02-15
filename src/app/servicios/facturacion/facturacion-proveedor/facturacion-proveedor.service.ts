import { Injectable } from '@angular/core';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { CargasGenerales, TarifaProveedor, UnidadesConFrio } from 'src/app/interfaces/tarifa-proveedor';
import { StorageService } from '../../storage/storage.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { Vehiculo } from 'src/app/interfaces/chofer';

@Injectable({
  providedIn: 'root'
})
export class FacturacionProveedorService {
  
  facturaProveedor!:FacturaOpProveedor;
  total!:number;
  $adicional!:number ;
  $tarifas!: any;
  ultimaTarifa!: TarifaProveedor;  
  $proveedores!: Proveedor[];
  proveedorOp!: Proveedor;
  $tarifaProveedor!:TarifaProveedor;


  constructor(private storageService: StorageService) { }

  proveedores(){
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });
  }

  facturarOpProveedor(op: Operacion)  :FacturaOpProveedor{        
    this.proveedores();
    //this.proveedores();
    //this.facturarOpChofer(op);
    this.buscarProveedor(op);    
    return this.facturaProveedor;
  }

  buscarProveedor(op:Operacion){
    let proveedor: any;
    proveedor = this.$proveedores.filter(function (proveedor:any){
      return proveedor.razonSocial === op.chofer.proveedor
    })
    //console.log("choferSeleccionado: ", choferSeleccionado);
    this.proveedorOp = proveedor[0];
    console.log("proveedorOp: ", this.proveedorOp);
    this.buscarTarifaProveedor(op);
  }

  buscarTarifaProveedor(op: Operacion){    
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      //console.log("esto pasa por aca?");
      //console.log("data: ", data);
      
      this.$tarifas = data.filter((tarifa: { idProveedor: number; }) => tarifa.idProveedor === this.proveedorOp.idProveedor);

      //console.log("Todas: ",this.$tarifas);

      // Encontrar la tarifa con el idTarifa más elevado
      this.ultimaTarifa = this.$tarifas.reduce((tarifaMaxima: { idTarifa: number; }, tarifaActual: { idTarifa: number; }) => {
        return tarifaActual.idTarifa > tarifaMaxima.idTarifa ? tarifaActual : tarifaMaxima;
      });

      // Ahora, ultimaTarifa contiene la tarifa con el idTarifa más elevado
      console.log("ultima: ", this.ultimaTarifa);
      this.calcularLiquidacion(op);
    });  
  }

  calcularLiquidacion(op:Operacion){    
    this.$tarifaProveedor = this.ultimaTarifa
    console.log("esta es la tarifa a facturar: ", this.$tarifaProveedor);
    //console.log("este es la categoria del vehiculo: ", op.chofer.vehiculo.categoria);    
    console.log("y este es la operacion a facturar: ", op);
    let jornada!: any
    let adicionales: any;


    if(op.unidadesConFrio){
      jornada = this.encontrarTarifaPorCategoriaUCF(op.chofer.vehiculo, this.$tarifaProveedor);
    }else{
      jornada = this.encontrarTarifaPorCategoriaCG(op.chofer.vehiculo, this.$tarifaProveedor);
    }

    console.log("esta es el valor de la JORNADA: ", jornada);
    
    adicionales = this.calcularAdicional(op, this.$tarifaProveedor)

    this.$adicional = adicionales;

    this.total = jornada + adicionales;

    console.log("TOTAAAAALLL: ", this.total);
    

   /*  if(op.unidadesConFrio){
      const categoria = op.chofer.vehiculo.categoria //toLowerCase(); // Asegúrate de que las categorías estén en minúsculas

      const tarifasPorCategoria: { [key: string]: keyof UnidadesConFrio } = {
        utilitario: 'utilitarioJornada',
        furgon: 'furgonJornada',
        camionliviano: 'camionLivianoJornada',
        chasis: 'chasisJornada',
        balancin: 'balancinJornada',
        semiremolquelocal: 'semiRemolqueLocalJornada',
      };
  
      const tarifaKey = tarifasPorCategoria[categoria];
      jornada = [tarifaKey];
      console.log("JORNADAAAA: ", tarifaKey);
      
    } else {
      
    } */
    
    
    //this.$adicional = this.calcularAdicional(op);
    //console.log("tarifa base: ", this.$tarifaChofer.valorJornada, " adicional: ", this.$adicional ); ;
    
    //this.total = this.$tarifaProveedor.valorJornada + this.$adicional;

    //console.log("esta es facturaChoferService. liquidacion del chofer: ", this.total);

    this.crearFacturaProveedor(op);    
  }

  encontrarTarifaPorCategoriaUCF(vehiculo: Vehiculo, tarifaProveedor: TarifaProveedor): number | undefined {

    //ESTO NO FUNCIONA PQ HAY Q CORREGIR LAS CATEGORIAS DE LOS VEHICULOS (mini = utilitario/maxi = furgon/ liviano = camion liviano )
   /*  const categoria = vehiculo.categoria //toLowerCase(); // Asegúrate de que las categorías estén en minúsculas

    const tarifasPorCategoria: { [key: string]: keyof CargasGenerales | keyof UnidadesConFrio } = {
        utilitario: 'utilitarioJornada',
        furgon: 'furgonJornada',
        camionliviano: 'camionLivianoJornada',
        chasis: 'chasisJornada',
        balancin: 'balancinJornada',
        semiremolquelocal: 'semiRemolqueLocalJornada',
    };

    const tarifaKey = tarifasPorCategoria[categoria];
    
    if (tarifaProveedor.cargasGenerales && tarifaProveedor.cargasGenerales.hasOwnProperty(tarifaKey)) {
      return (tarifaProveedor.cargasGenerales as any)[tarifaKey] as number;
  } else if (tarifaProveedor.unidadesConFrio && tarifaProveedor.unidadesConFrio.hasOwnProperty(tarifaKey)) {
      return (tarifaProveedor.unidadesConFrio as any)[tarifaKey] as number;
  }

  return undefined;
 */

  switch (vehiculo.categoria) {
    case 'mini':
      return tarifaProveedor.unidadesConFrio.utilitarioJornada;
    case 'maxi':
      return tarifaProveedor.unidadesConFrio.furgonJornada;
    case 'liviano':
      return tarifaProveedor.unidadesConFrio.camionLivianoJornada;
    case 'chasis':
      return tarifaProveedor.unidadesConFrio.chasisJornada;
    case 'balancin':
      return tarifaProveedor.unidadesConFrio.balancinJornada;
    case 'semiRemolqueLocal':
      return tarifaProveedor.unidadesConFrio.semiRemolqueLocalJornada;
    default:
      alert("error categoria UCF")
      return undefined; // Manejar categorías no reconocidas según tus necesidades
  }

  }

  encontrarTarifaPorCategoriaCG(vehiculo: Vehiculo, tarifaProveedor: TarifaProveedor): number | undefined {

 

  switch (vehiculo.categoria) {
    case 'mini':
      return tarifaProveedor.cargasGenerales.utilitarioJornada;
    case 'maxi':
      return tarifaProveedor.cargasGenerales.furgonJornada;
    case 'liviano':
      return tarifaProveedor.cargasGenerales.camionLivianoJornada;
    case 'chasis':
      return tarifaProveedor.cargasGenerales.chasisJornada;
    case 'balancin':
      return tarifaProveedor.cargasGenerales.balancinJornada;
    case 'semiRemolqueLocal':
      return tarifaProveedor.cargasGenerales.semiRemolqueLocalJornada;
    default:
      alert("error categoria CG")
      return undefined; // Manejar categorías no reconocidas según tus necesidades
  }

  }

  calcularAdicional(op:Operacion, tarifa: TarifaProveedor): number | undefined {
    let acompaniante: number;
    let adicionalKm!: number;

    if(op.acompaniante){
      acompaniante = tarifa.adicionales.acompaniante;
    }else{
      acompaniante = 0;
    }

    if(op.km !== null){

     switch (true){
      case (op.km <=80):
        adicionalKm = 0;
        console.log("adicional km: ", 0);
      break;
      case (op.km >80 && op.km<=150):
        adicionalKm = tarifa.adicionales.adicionalKm.primerSector;
        console.log("adicional km: ", tarifa.adicionales.adicionalKm.primerSector);
        
      break;
      case (op.km >150):
        let resto:number;
        let secciones:number;
        
        resto = op.km - 150;
        secciones = resto / 50
        console.log("secciones: ", secciones);
        secciones = Math.floor(secciones)
        console.log("math.floor secciones: ", secciones);
        if(((op.km - 150) % 50) === 0){
          //alert("cuenta redonda");
          adicionalKm = tarifa.adicionales.adicionalKm.primerSector + tarifa.adicionales.adicionalKm.sectorSiguiente*secciones;
          console.log("adicional KM: ", adicionalKm);           

        } else{
          //alert("con resto");
          adicionalKm = tarifa.adicionales.adicionalKm.primerSector + ((tarifa.adicionales.adicionalKm.sectorSiguiente)*(secciones+1));
          console.log("adicional KM: ", adicionalKm);
        }
        
        

      break;
      
      default:
        adicionalKm = 0;
          alert("error adicional km")
          break;
  
      
    } 
  }
  
  console.log("adicionales + acompañante: ",(adicionalKm + acompaniante) );
  

    return acompaniante + adicionalKm;
    
    /* let adicional: number;
    switch(true){
      case (op.km !== null && op.km <= 100):{
        adicional = 0;
        return adicional;
      }
      case (op.km !== null && op.km > 100 && op.km <= 150):{
        adicional = this.$tarifaChofer.km.adicionalKm1;
        return adicional;
      }
      case (op.km !== null && op.km > 150 && op.km <= 200):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2;
        return adicional;
      }
      case (op.km !== null && op.km > 200 && op.km <= 250):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3;
        return adicional;
      }
      case (op.km !== null && op.km > 250 && op.km <= 300):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3 + this.$tarifaChofer.km.adicionalKm4;
        return adicional;
      }
      case (op.km !== null && op.km > 300):{
        adicional = this.$tarifaChofer.km.adicionalKm1 + this.$tarifaChofer.km.adicionalKm2 + this.$tarifaChofer.km.adicionalKm3 + this.$tarifaChofer.km.adicionalKm4 + this.$tarifaChofer.km.adicionalKm5;
        return adicional;
      }
      default:{ 
        return adicional=0;
      }
    } */
  }

  crearFacturaProveedor(op:Operacion){

    this.facturaProveedor = {
      id: null,
      idFacturaProveedor: new Date().getTime(),
      operacion: op,        
      idProveedor: this.proveedorOp.id,
      idChofer: op.chofer.idChofer,
      fecha: new Date().toISOString().split('T')[0],    
      valorJornada: 1000,
      adicional: this.$adicional,      
      total: this.total,
    }
    //console.log(this.facturaChofer);
    
    //this.altaFacturaChofer()
  }



}
