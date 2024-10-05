import { Injectable } from '@angular/core';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { StorageService } from '../storage/storage.service';
import { TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { CargasGenerales, TarifaProveedor } from 'src/app/interfaces/tarifa-proveedor';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaCliente } from 'src/app/interfaces/tarifa-cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { DbFirestoreService } from '../database/db-firestore.service';
import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaGralChofer } from 'src/app/interfaces/tarifa-gral-chofer';
import { TarifaEspCliente } from 'src/app/interfaces/tarifa-esp-cliente';
import { TarifaGralProveedor } from 'src/app/interfaces/tarifa-gral-proveedor';
@Injectable({
  providedIn: 'root'
})
export class BuscarTarifaService {
//Este es el que va
  $tarifasChoferes: TarifaChofer [] = [];
  $tarifasClientes: TarifaCliente [] = []; 
  $tarifasProveedores: TarifaProveedor [] = [];
  $proveedores!: Proveedor[]  ;
  $choferes!: any;
  $clientes!: any;
  choferBoolean!: boolean;
  clienteBoolean!: boolean;
  ultTarifaEspProveedor!: TarifaGralProveedor;
  

  ngOnInit(): void {   
    this.storageService.historialTarifas$.subscribe(data => {
      this.$tarifasChoferes = data;
    });
    this.storageService.historialTarifasProveedores$.subscribe(data => {
      this.$tarifasProveedores = data;
    });
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
    });   
   
    
  }

  constructor(private storageService:StorageService, private dbFirebase: DbFirestoreService) { }


    buscarTarifaChoferCliente(chofer:Chofer, cliente: Cliente) {
    this.choferBoolean = false;
    this.clienteBoolean = false;
  
    this.verificarChofer(chofer, cliente);
  }

  verificarChofer(chofer:Chofer, cliente: Cliente){
    this.dbFirebase.existeTarifa("tarifasChofer", chofer.idChofer, "idChofer").subscribe(existe => {
      if (existe) {
        this.choferBoolean = true; 
        console.log('El chofer tiene tarifas guardadas.');  
        this.verificarCliente(cliente);     
      } else {
        this.choferBoolean = false;
        console.log('El chofer no tiene tarifas guardadas.');
        this.verificarCliente(cliente);
      }
    });
  }

  verificarCliente(cliente: Cliente){
    this.dbFirebase.existeTarifa("tarifasCliente", cliente.idCliente, "idCliente").subscribe(existe => {
      if (existe) {
        this.clienteBoolean = true;     
        console.log('El cliente tiene tarifas guardadas.');   
        this.guardarObservable()
      } else {
        this.clienteBoolean = false;
        console.log('El chofer no tiene tarifas guardadas.');
        this.guardarObservable()
      }
    });
  }

  buscarTarifaProveedorCliente(proveedor:Proveedor, cliente: Cliente) {
    this.choferBoolean = false;
    this.clienteBoolean = false;
    this.verificarProveedor(proveedor, cliente);
  }

  verificarProveedor(proveedor:Proveedor, cliente: Cliente){
    this.dbFirebase.existeTarifa("tarifasProveedor", proveedor.idProveedor, "idProveedor").subscribe(existe => {
      if (existe) {
        this.choferBoolean = true; 
        console.log('El proveedor tiene tarifas guardadas.');  
        this.verificarCliente(cliente);     
      } else {
        this.choferBoolean = false;
        console.log('El proveedor no tiene tarifas guardadas.');
        this.verificarCliente(cliente);
      }
    });
  }
  


  guardarObservable(){
    //console.log("4)", this.choferBoolean,this.clienteBoolean,);
    let array: any[] = [];	
    let respuesta = {
      chofer: this.choferBoolean,
      cliente: this.clienteBoolean,
    }
    array.push(respuesta);
    //console.log("5)", array);  
    this.storageService.setInfo("erroresTarifas", array);  
    
  }

  buscarIdTarifa(){
    let facOpChoferes: any
    facOpChoferes = this.storageService.loadInfo("facOpLiqChofer")
    //console.log("1)factura Op chofer", facOpChoferes);
    return facOpChoferes[0].idTarifa;
  }
  
  buscarTarifaChofer() :TarifaChofer{
    //let facuraChofer: FacturaOpChofer [] = []
    //let tarifaAplicada : TarifaChofer [] = [];
    //let facOpChoferes : FacturaOpChofer [] = []; 
    
     /*  let facOpChoferes = this.storageService.loadInfo("facOpLiqChofer")
      //console.log("1)factura Op chofer", facOpChoferes);
      let idTarifa = facOpChoferes[0].idTarifa;
      //console.log("2", idTarifa);
      this.storageService.getByFieldValue("tarifasChofer", "idTarifaChofer", idTarifa) */
      let tarifaAplicada: any;
      
      //console.log("5) tarifas chofer: ",tarifaAplicada);    
      setTimeout(() => {
      tarifaAplicada = this.storageService.loadInfo("tarifasChofer"); 
        
      }, 1000); // 5000 milisegundos = 5 segundos 
      
/*     this.storageService.consultasFacOpLiqChofer$.subscribe(data =>{
      //console.log("1) data op choferes: ",data);
      facOpChoferes = data;
      //console.log("facuras op choferes: ",facOpChoferes);
      
      facuraChofer = facOpChoferes.filter((factura : FacturaOpChofer)=>{
        //console.log("2)", factura.operacion.idOperacion, operacion.idOperacion);        
        return factura.operacion.idOperacion === operacion.idOperacion
      });
      //console.log("3) ", facuraChofer);      
      
      this.storageService.historialTarifas$.subscribe(data =>{
        this.$tarifasChoferes = data;
        //console.log("4) tarifas choferes: ",this.$tarifasChoferes);
        tarifaAplicada = this.$tarifasChoferes.filter((tarifa:TarifaChofer) =>{
          return tarifa.idTarifa === facuraChofer[0].idTarifa;
        })
        
    })
      
     
    }) */
    
    return tarifaAplicada[0];
    
  }

  buscarTarifaProveedor(operacion:Operacion) :TarifaProveedor{
    let facuraProveedor: FacturaOpProveedor [] = []
    let tarifaAplicada : TarifaProveedor [] = [];
    let facOpProveedores : FacturaOpProveedor [] = [];
    
    
    this.storageService.consultasFacOpLiqProveedor$.subscribe(data =>{
      ////console.log("1) data op proveedores: ",data);
      facOpProveedores = data;
      ////console.log("facuras op choferes: ",facOpChoferes);
      
      facuraProveedor = facOpProveedores.filter((factura : FacturaOpProveedor)=>{
        ////console.log(factura.operacion.idOperacion, operacion.idOperacion);        
        return factura.operacion.idOperacion === operacion.idOperacion
      });
      ////console.log("2) factura proveedor: ", facuraProveedor);      
      
      this.storageService.historialTarifasProveedores$.subscribe(data =>{
        this.$tarifasProveedores = data;
        ////console.log("3) tarifas proveedores: ",this.$tarifasChoferes);
        tarifaAplicada = this.$tarifasProveedores.filter((tarifa:TarifaProveedor) =>{
          return tarifa.idTarifa === facuraProveedor[0].idTarifa;
        })        
    })          
    })    
    ////console.log("4) tarifas proveedor: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  }

  buscarCategoriaProveedor(tarifa: TarifaProveedor, categoria: string):number{
    switch (categoria) {
      case "mini":
        return tarifa.cargasGenerales.utilitario;        

      case "maxi":
        return tarifa.cargasGenerales.furgon;
      
      case "furgon grande":
        return tarifa.cargasGenerales.furgonGrande;

      case "camión liviano":
        return tarifa.cargasGenerales.chasisLiviano;

      case "chasis":
        return tarifa.cargasGenerales.chasis;

      case "balancin":
        return tarifa.cargasGenerales.balancin;
        
      case "semi remolque local":
        return tarifa.cargasGenerales.semiRemolqueLocal;

      case "portacontenedores":
        return tarifa.cargasGenerales.portacontenedores;
    
      default:
        return 0;
  }
}


buscarCategoriaCliente(tarifa: TarifaCliente, categoria: string):number{
  switch (categoria) {
    case "mini":
      return tarifa.cargasGenerales.utilitario;        

    case "maxi":
      return tarifa.cargasGenerales.furgon;
    
    case "furgon grande":
      return tarifa.cargasGenerales.furgonGrande;

    case "camión liviano":
      return tarifa.cargasGenerales.chasisLiviano;

    case "chasis":
      return tarifa.cargasGenerales.chasis;

    case "balancin":
      return tarifa.cargasGenerales.balancin;
      
    case "semi remolque local":
      return tarifa.cargasGenerales.semiRemolqueLocal;

    case "portacontenedores":
      return tarifa.cargasGenerales.portacontenedores;
  
    default:
      return 0;
}
}

  buscarTarifaClienteId():TarifaCliente{
    //let tarifaAplicada : TarifaCliente [] = [];
    ////console.log("1S) tarifas clientes: ",this.$tarifasClientes[0]);
    let tarifaAplicada: any;
    this.storageService.historialTarifasClientes$.subscribe(data => {
      this.$tarifasClientes = data;
      tarifaAplicada = this.$tarifasClientes[0];  
    }); 
    
      console.log("1) tarifa aplicada", tarifaAplicada);
      return tarifaAplicada[0];
 
    /* this.storageService.historialTarifasClientes$.subscribe(data =>{
      this.$tarifasClientes = data;
      //console.log("1S) tarifas choferes: ",this.$tarifasChoferes);
      tarifaAplicada = this.$tarifasClientes.filter((tarifa:TarifaCliente)=>{
        //console.log("2S) tarifa aplicada:", tarifa.idTarifaCliente, idTarifa);        
        return tarifa.idTarifaCliente === idTarifa  
      })     
      ////console.log("tarifas clientes: ",tarifaAplicada);   
      tarifaAplicada = this.$tarifasClientes;
      //console.log("2S) tarifa aplicada:", tarifaAplicada);        
    }) */
    
    
//    return tarifaAplicada[0];
  }

  buscarTarifaChoferId(idTarifa:number):TarifaChofer{
    let tarifaAplicada : TarifaChofer [] = [];
    this.storageService.historialTarifas$.subscribe(data =>{
      this.$tarifasChoferes = data;
      ////console.log("1) tarifas choferes: ",this.$tarifasChoferes);
      tarifaAplicada = this.$tarifasChoferes.filter((tarifa:TarifaChofer)=>{
        ////console.log("2)", tarifa.idTarifa, idTarifa);        
        return tarifa.idTarifa === idTarifa  
      })      
      ////console.log("tarifas clientes: ",tarifaAplicada);    
    })
    
    ////console.log("3) tarifa chofere: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  }

  buscarTarifaCliente(operacion:Operacion) :TarifaCliente{
    let facuraCliente: FacturaOpCliente [] = []
    let tarifaAplicada : TarifaCliente [] = [];
    let facOpClientes : FacturaOpCliente [] = [];
    ////console.log("0)", operacion);
    
    
    this.storageService.consultasFacOpLiqCliente$.subscribe(data =>{
      ////console.log("1) data op clientes: ",data);
      facOpClientes = data;
      ////console.log("facuras op clientes: ",facOpClientes);
      
      facuraCliente = facOpClientes.filter((factura : FacturaOpCliente)=>{
        ////console.log("2)", factura.operacion.idOperacion, operacion.idOperacion);        
        return factura.operacion.idOperacion === operacion.idOperacion
      });
      ////console.log("3) ", facuraCliente);      
      
      this.storageService.historialTarifasClientes$.subscribe(data =>{
        this.$tarifasClientes = data;
        ////console.log("4) tarifas clientes: ",this.$tarifasClientes);
        tarifaAplicada = this.$tarifasClientes.filter((tarifa:TarifaCliente) =>{
          ////console.log("5): ",tarifa.idTarifaCliente, facuraCliente[0].idTarifa);  
          return tarifa.idTarifa === facuraCliente[0].idTarifa;
        })
        
    })
      
     
    })
    
    ////console.log("6) tarifa cliente: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  }

  buscarTarifaProveedorId(idTarifa:number):TarifaProveedor{
    let tarifaAplicada : TarifaProveedor [] = [];
    this.storageService.historialTarifasProveedores$.subscribe(data =>{
      this.$tarifasProveedores = data;
      ////console.log("1) tarifas proveedores: ",this.$tarifasProveedores);
      tarifaAplicada = this.$tarifasProveedores.filter((tarifa:TarifaProveedor)=>{
        ////console.log("2)", tarifa.idTarifaProveedor, idTarifa);        
        return tarifa.idTarifa === idTarifa  
      })      
      ////console.log("3) tarifas proveedores: ",tarifaAplicada[0]);      
    })
    
    ////console.log("4) tarifas proveedores: ",tarifaAplicada[0]);    
    return tarifaAplicada[0];
  }

  getACobrar(op:Operacion, ultTarifaGralCliente: TarifaGralCliente, ultTarifaEspCliente: TarifaGralCliente){
    let vehiculo
    vehiculo  = op.chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === op.patenteChofer;
    });
    let categoria = vehiculo[0].categoria.catOrden
    let catCG = ultTarifaGralCliente?.cargasGenerales?.filter((cat: CategoriaTarifa)=>{
      return cat.orden === categoria
    });      
      
    if(op.tarifaTipo.personalizada){
      return op.tPersonalizada.aCobrar
    } else if(op.tarifaTipo.especial){
        if(op.cliente.tarifaTipo.especial){   
          this.storageService.getElemntByIdLimit("tarifasEspCliente","idCliente","idTarifa",op.cliente.idCliente,"ultTarifaEspCliente");         
            let vehiculoEsp
            vehiculoEsp  = op.chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
                return vehiculo.dominio === op.patenteChofer;
            });
            let categoriaEsp = vehiculo[0].categoria.catOrden
            let catEsp = ultTarifaEspCliente.cargasGenerales.filter((cat: CategoriaTarifa)=>{
              return cat.orden === categoria
            });  
            return catEsp[0].valor
        }else{
          return catCG[0].valor;
        }
    } else if (op.tarifaTipo.eventual){
      return op.tEventual.cliente.valor
    } else {
      return catCG[0].valor;
    }       
  } 

  getAPagar(op:Operacion, ultTarifaGralChofer:TarifaGralChofer, ultTarifaEspChofer: TarifaGralChofer, ultTarifaGralProveedor: TarifaGralProveedor, proveedor:Proveedor[]){
    let vehiculo
    vehiculo  = op.chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === op.patenteChofer;
    });
    let categoria = vehiculo[0].categoria.catOrden
    let catCG = ultTarifaGralChofer.cargasGenerales.filter((cat: CategoriaTarifa)=>{
      return cat.orden === categoria
    });      
      
    if(op.chofer.proveedor === "monotributista"){
        if(op.tarifaTipo.personalizada){
          return op.tPersonalizada.aPagar
        } else if(op.tarifaTipo.especial){
            if(op.chofer.tarifaTipo?.especial){
                this.storageService.getElemntByIdLimit("tarifasEspChofer","idChofer","idTarifa",op.chofer.idChofer,"ultTarifaEspChofer");
                let vehiculoEsp
                vehiculoEsp  = op.chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
                    return vehiculo.dominio === op.patenteChofer;
                });
                let categoriaEsp = vehiculo[0].categoria.catOrden
                let catEsp = ultTarifaEspChofer.cargasGenerales.filter((cat: CategoriaTarifa)=>{
                  return cat.orden === categoria
                });  
                return catEsp[0].valor
            }else{
              return catCG[0].valor;
            }
        } else if (op.tarifaTipo.eventual){
          return op.tEventual.chofer.valor
        } else {
          return catCG[0].valor;
        }       
    } else {
      return this.getACobrarProveedor(op, ultTarifaGralProveedor, proveedor);
    }
  } 
  getACobrarProveedor(op:Operacion, ultTarifaGralProveedor: TarifaGralProveedor, proveedor: Proveedor[]){
    
   /*  proveedor = $proveedores.filter((proveedor:Proveedor)=>{
      return proveedor.razonSocial === op.chofer.proveedor
    }); */
    let vehiculo
    vehiculo  = op.chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
        return vehiculo.dominio === op.patenteChofer;
    });
    let categoria = vehiculo[0].categoria.catOrden
    let catCG = ultTarifaGralProveedor.cargasGenerales.filter((cat: CategoriaTarifa)=>{
      return cat.orden === categoria
    });      
      
    if(op.tarifaTipo.personalizada){
      return op.tPersonalizada.aPagar;
    } else if(op.tarifaTipo.especial){
          this.storageService.ultTarifaEspProveedor$
          //.pipe(take(2)) // Asegúrate de que la suscripción se complete después de la primera emisión
          .subscribe(data =>{
          ////console.log("2c) data: ", data);                
          this.ultTarifaEspProveedor = data || {}; // Asegura que la tarifa siempre sea un objeto, incluso si no hay datos
          this.ultTarifaEspProveedor.cargasGenerales = this.ultTarifaEspProveedor.cargasGenerales || []; // Si cargasGenerales no está definido, lo inicializamos como array vacío
          console.log("6) ult tarifa ESP PROVEEDOR: ",this.ultTarifaEspProveedor);           
          });
        if(proveedor[0].tarifaTipo.especial){
            this.storageService.getElemntByIdLimit("tarifasEspProveedor","idProveedor","idTarifa",proveedor[0].idProveedor,"ultTarifaEspProveedor");
            let vehiculoEsp
            vehiculoEsp  = op.chofer.vehiculo.filter((vehiculo:Vehiculo)=>{
                return vehiculo.dominio === op.patenteChofer;
            });
            let categoriaEsp = vehiculo[0].categoria.catOrden
            let catEsp = this.ultTarifaEspProveedor.cargasGenerales.filter((cat: CategoriaTarifa)=>{
              return cat.orden === categoria
            });  
            return catEsp[0].valor
        }else{
          return catCG[0].valor;
        }
    } else if (op.tarifaTipo.eventual){
      return op.tEventual.chofer.valor
    } else {
      return catCG[0].valor;
    }       
  } 
}
