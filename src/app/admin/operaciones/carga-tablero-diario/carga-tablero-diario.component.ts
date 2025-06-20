import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { Operacion, TarifaEventual } from 'src/app/interfaces/operacion';
import { CategoriaTarifa, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import Swal from 'sweetalert2';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';

type ChoferAsignado = ConId<Chofer> & {
  hojaDeRuta?: string;
  observaciones?: string;
  tEventual: boolean;
  categoriaAsignada?: any;
  conceptoChofer?: string;
  valorChofer?: number;
  conceptoCliente?: string;
  valorCliente?: number;
};

@Component({
  selector: 'app-carga-tablero-diario',
  standalone:false,
  templateUrl: './carga-tablero-diario.component.html',
  styleUrl: './carga-tablero-diario.component.scss'
})
export class CargaTableroDiarioComponent implements OnInit, OnDestroy {
  @Input() fromParent!: { item: any[] };

  operaciones: Operacion[] = [];
  operacionesAgrupadas: { clienteId: number; razonSocial: string; tipo: 'eventual' | 'personalizada' | 'especial' | 'general'; operaciones: Operacion[] }[] = [];
  clientes: Cliente[] = [];
  fecha: string = '';
  tarifasPersonalizadas: TarifaPersonalizadaCliente[] = []

  constructor(
    public activeModal: NgbActiveModal,
    private storageService: StorageService,
    private formNumServ: FormatoNumericoService,
  ) {}
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }

  ngOnInit(): void {
    const storedClientes = localStorage.getItem('clientes');
    this.clientes = storedClientes ? JSON.parse(storedClientes) : [];

    const entradas = this.fromParent.item;
    this.fecha = entradas[0]?.fecha || '';
    this.tarifasPersonalizadas = this.storageService.loadInfo('tarifasPersCliente') || [];


    for (const entrada of entradas) {
      const cliente = this.clientes.find(c => c.idCliente === entrada.clienteId);
      if (!cliente) continue;

      for (const chofer of entrada.choferes) {
        const tarifaTipo = this.getTarifaTipo(cliente, chofer);

        const op: Operacion = {
          idOperacion: new Date().getTime() + Math.floor(Math.random() * 1000),
          fecha: entrada.fecha,
          km: 0,
          cliente,
          chofer,
          observaciones: chofer.observaciones || '',
          hojaRuta: chofer.hojaDeRuta || '',
          acompaniante: false,
          facturaCliente: 0,
          facturaChofer: 0,
          tarifaEventual: {
            chofer: { concepto: '', valor: 0 },
            cliente: { concepto: '', valor: 0 }
          },
          tarifaPersonalizada: {
            seccion: 0,
            categoria: 0,
            nombre: '',
            aCobrar: 0,
            aPagar: 0
          },
          patenteChofer: chofer.vehiculo.length === 1 ? chofer.vehiculo[0].dominio : "",
          estado: {
            abierta: true,
            cerrada: false,
            facCliente: false,
            facChofer: false,
            facturada: false,
            proformaCl: false,
            proformaCh: false
          },
          tarifaTipo,
          valores: {
            cliente: {
              acompValor: 0,
              kmAdicional: 0,
              tarifaBase: 0,
              aCobrar: 0
            },
            chofer: {
              acompValor: 0,
              kmAdicional: 0,
              tarifaBase: 0,
              aPagar: 0
            }
          },
          multiplicadorCliente: 1,
          multiplicadorChofer: 1
        } as any;

        (op as any).tarifaTipoOriginal = { ...op.tarifaTipo };
        (op as any).originalEventual = tarifaTipo.eventual; // Propiedad temporal

        this.operaciones.push(op);
      }
    }

    this.agruparOperacionesPorCliente();
  }

  getTarifaTipo(cliente: Cliente, chofer: ConId<Chofer>) {
    if (cliente.tarifaTipo?.eventual || chofer.tarifaTipo?.eventual) {
      return { general: false, especial: false, eventual: true, personalizada: false };
    }

    if (cliente.tarifaTipo?.personalizada) {
      return { general: false, especial: false, eventual: false, personalizada: true };
    }

    if (cliente.tarifaTipo?.especial || chofer.tarifaTipo?.especial) {
      return { general: false, especial: true, eventual: false, personalizada: false };
    }

    return { general: true, especial: false, eventual: false, personalizada: false };
  }

  agruparOperacionesPorCliente(): void {
    const mapa = new Map<number, Operacion[]>();

    for (const op of this.operaciones) {
      if (!mapa.has(op.cliente.idCliente)) {
        mapa.set(op.cliente.idCliente, []);
      }
      mapa.get(op.cliente.idCliente)?.push(op);
    }

    this.operacionesAgrupadas = Array.from(mapa.entries()).map(([clienteId, operaciones]) => {
      const razonSocial = operaciones[0].cliente.razonSocial;
      const tipo = operaciones[0].tarifaTipo.eventual
        ? 'eventual'
        : operaciones[0].tarifaTipo.personalizada
        ? 'personalizada'
        : operaciones[0].tarifaTipo.especial
        ? 'especial'
        : 'general';

      return { clienteId, razonSocial, tipo, operaciones };
    });
  }

  revertirEstadoEventual(op: any): void {
    if (op.tarifaTipo.eventual) {
      // Usuario eligió hacerla eventual: desactivar todo excepto eventual
      op.tarifaTipo = {
        general: false,
        especial: false,
        personalizada: false,
        eventual: true
      };
    } else {
      // Usuario volvió a “No”: restauramos el estado original
      op.tarifaTipo = { ...op.tarifaTipoOriginal };
    }
  }

  guardar(): void {        
    const errores: string[] = [];

    for (const grupo of this.operacionesAgrupadas) {
      for (const op of grupo.operaciones) {
        errores.push(...this.validarOperacion(op));
      }
    }
  
    if (errores.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validación fallida',
        html: '<ul class="text-start">' + errores.map(e => `<li>${e}</li>`).join('') + '</ul>'
      });
      return;
    }
    //console.log('✅ Validación OK. Guardando operaciones...');
    // Si no hay errores, se puede proceder
    Swal.fire({
        title: `¿Desea agregar las operación con fecha ${this.fecha}?`,
        //text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Agregar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.operaciones.map(op=>{
            if(op.tarifaTipo.eventual){
              op.tarifaEventual = this.formatoEventual(op);
            }
          })
          console.log(this.operaciones);
          this.activeModal.close(this.operaciones);          
        }else{
          // Si el usuario cancela, realiza la acción correspondiente
         
        }
      });   

  }

  formatoEventual(op:any):TarifaEventual{
    op.tarifaEventual = {
      chofer:{
          concepto: op.tarifaEventual.chofer.concepto,
          valor: this.formNumServ.convertirAValorNumerico(op.tarifaEventual.chofer.valor),    
      },
      cliente:{
          concepto: op.tarifaEventual.cliente.concepto,
          valor: this.formNumServ.convertirAValorNumerico(op.tarifaEventual.cliente.valor),   
      },
    }
    return op.tarifaEventual;
  }

  esOriginalEventual(op: any): boolean {
    return !!op.originalEventual;
  }

  esEditableEventual(op: any): boolean {
    return !op.originalEventual;
  }

  esHabilitadoTarifaEventual(op: any): boolean {
    return op.tarifaTipo.eventual;
  }

  esHabilitadoTarifaPersonalizada(op: any): boolean {
    return op.tarifaTipo.personalizada;
  }

  getChoferTarifaTipo(op:any){
    const tipo = op.chofer.tarifaTipo.eventual
            ? 'Eventual'
            : op.chofer.tarifaTipo.especial
            ? 'Especial'
            : 'General';

      return tipo;
    
  }

  getTarifaPersonalizada(idCliente: number): TarifaPersonalizadaCliente | null {
    return this.tarifasPersonalizadas.find(t => t.idCliente === idCliente) || null;
  }

  getCategoriasDisponibles(op: Operacion): CategoriaTarifa[] {
    if (!op.tarifaTipo.personalizada || !op.tarifaPersonalizada?.seccion || !op.cliente) return [];

    const tarifa = this.getTarifaPersonalizada(op.cliente.idCliente);
    const seccion = tarifa?.secciones.find(s => s.orden === +op.tarifaPersonalizada.seccion);
    return seccion?.categorias || [];
  }

  onSeccionChange(op: Operacion): void {
    op.tarifaPersonalizada.seccion = Number(op.tarifaPersonalizada.seccion);
    op.tarifaPersonalizada.categoria = -1;
    op.tarifaPersonalizada.nombre = '';
    op.tarifaPersonalizada.aCobrar = 0;
    op.tarifaPersonalizada.aPagar = 0;
  }

  onCategoriaChange(op: Operacion): void {
    op.tarifaPersonalizada.categoria = Number(op.tarifaPersonalizada.categoria);
    const tarifa = this.getTarifaPersonalizada(op.cliente.idCliente);
    if (!tarifa) return;

    const seccion = tarifa.secciones.find(s => s.orden === +op.tarifaPersonalizada.seccion);
    const categoria = seccion?.categorias.find(c => c.orden === +op.tarifaPersonalizada.categoria);

    if (categoria) {
      op.tarifaPersonalizada.nombre = categoria.nombre;
      op.tarifaPersonalizada.aCobrar = categoria.aCobrar;
      op.tarifaPersonalizada.aPagar = categoria.aPagar;
    }
  }

  validarOperacion(op: Operacion): string[] {
    const errores: string[] = [];

    // 🔹 Validar Patente
    if (!op.patenteChofer || op.patenteChofer.trim() === '') {
      errores.push('Debe seleccionar una patente para el chofer ' + op.chofer.apellido + ', ' + op.chofer.nombre);
    }

    // 🔹 Validar Tarifa Eventual
    if (op.tarifaTipo.eventual) {
      const t = op.tarifaEventual;
      if (!t.chofer.concepto || t.chofer.concepto.trim() === '') {
        errores.push(`Falta concepto del chofer en tarifa eventual para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      }
      if (t.chofer.valor <= 0) {
        errores.push(`El valor del chofer en tarifa eventual debe ser mayor a 0 para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      }
      if (!t.cliente.concepto || t.cliente.concepto.trim() === '') {
        errores.push(`Falta concepto del cliente en tarifa eventual para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      }
      if (t.cliente.valor <= 0) {
        errores.push(`El valor del cliente en tarifa eventual debe ser mayor a 0 para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      }
    }

    // 🔹 Validar Tarifa Personalizada
    if (op.tarifaTipo.personalizada) {
      const tp = op.tarifaPersonalizada;
      if (tp.seccion <= 0) {
        errores.push(`Debe seleccionar una sección válida para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      }
      if (tp.categoria <= 0) {
        errores.push(`Debe seleccionar una categoría válida para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      }
      /* if (!tp.nombre || tp.nombre.trim() === '') {
        errores.push(`Debe establecer un nombre de categoría para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      }
      if (tp.aCobrar <= 0) {
        errores.push(`El valor a cobrar debe ser mayor a 0 para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      }
      if (tp.aPagar <= 0) {
        errores.push(`El valor a pagar debe ser mayor a 0 para ${op.chofer.apellido}, ${op.chofer.nombre}`);
      } */
    }

    return errores;
  }

  getClienteEventual(idCliente:number){
    const cliente = this.clientes.find(c => c.idCliente === idCliente);
    if(cliente?.tarifaTipo.eventual){
      return true;
    } else {
      return false;
    }
  }

  getClientePersonalizada(idCliente:number){
    const cliente = this.clientes.find(c => c.idCliente === idCliente);
    if(cliente?.tarifaTipo.personalizada){
      return true;
    } else {
      return false;
    }
  }

  eliminarOperacion(grupo: any, op: Operacion): void {
    Swal.fire({
      title: '¿Eliminar operación?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        const index = grupo.operaciones.indexOf(op);
        if (index > -1) {
          grupo.operaciones.splice(index, 1);
          Swal.fire('Eliminada', 'La operación fue eliminada correctamente.', 'success');
        }
      }
    });
  }

  tieneErrores(op: Operacion): boolean {
    return this.validarOperacion(op).length > 0;
  }





}
