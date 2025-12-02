import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId } from 'src/app/interfaces/conId';
import { InformeVenta } from 'src/app/interfaces/informe-venta';
import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { ResumenVenta } from 'src/app/interfaces/resumen-venta';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

interface ClienteGrupo {
  cliente: Cliente;
  cantidadOperaciones: number;
  totalCobrar: number;
  totalPagar: number;
  comision: number;
  valorComision: number; // subtotal
}

interface VendedorGrupo {
  vendedor: ConId<Vendedor>;
  clientes: ClienteGrupo[];
  totalVendedor: number;
  estadoPago: boolean ;
}

interface InformeVentaExtendido extends InformeVenta {
  porcentajeComision: number;
  valorComision: number;
}

@Component({
  selector: 'app-tablero-actividad',
  standalone: false,
  templateUrl: './tablero-actividad.component.html',
  styleUrl: './tablero-actividad.component.scss'
})
export class TableroActividadComponent implements OnInit, OnDestroy{

  private destroy$ = new Subject<void>();
  componenteOp: string = "informesVenta"
  choferes: ConId<Chofer>[] = [];
  clientes: ConId<Cliente>[] = [];
  proveedores: ConId<Proveedor>[] = [];
  fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  operaciones:ConId<Operacion>[]=[];
  vendedorGrupos!: VendedorGrupo[];
  informesVenta!: ConId<InformeVenta>[];
  vendedores!: ConId<Vendedor>[];

  constructor(
    
    private storageService: StorageService,
    private excelServ: ExcelService, 
    private pdfServ: PdfService, 
    private modalService: NgbModal, 
    private dbFirebase: DbFirestoreService,

  ){}

      ngOnInit(): void {
      
      
  
      /// CHOFERES/CLIENTES/PROVEEDORES
      this.choferes = this.storageService.loadInfo('choferes');
      this.choferes = this.choferes.sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      this.clientes = this.storageService.loadInfo('clientes');
      this.clientes = this.clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      this.proveedores = this.storageService.loadInfo('proveedores');
      this.proveedores = this.proveedores.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)); // Ordena por el nombre del chofer
      this.vendedores = this.storageService.loadInfo('vendedores');
  
      ////////// FECHAS E INFORMES OP ///////////////
      this.storageService.fechasConsulta$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fechas => {
        this.fechasConsulta = fechas;
        console.log("this.fechasConsulta", this.fechasConsulta);
        
  
         // 2. Una vez obtenidas, sincronizar informes
            this.storageService.syncChangesDateValue<InformeVenta>(
              this.componenteOp,
              "fecha",
              this.fechasConsulta.fechaDesde,
              this.fechasConsulta.fechaHasta,
              "desc"
            );
  
            
  
            this.storageService.getObservable<ConId<InformeVenta>>(this.componenteOp)
              .pipe(takeUntil(this.destroy$))
              .subscribe(data => {
                this.informesVenta = data;
                if (this.informesVenta) {
                  console.log("informesVenta: ", this.informesVenta);
                    // 👉 REARMAR LOS GRUPOS
                    this.cargarDatos();
                  
                } else {
                  this.mensajesError("error: informesVenta", "error");
                }
              });
      });

    }
  
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }

    mensajesError(msj:string, resultado:string){
      Swal.fire({
        icon: resultado === 'error' ? "error" : "success",
        //title: "Oops...",
        text: `${msj}`
        //footer: `${msj}`
      });
    }

    // ============================================================
  //   CARGA Y PROCESA TODOS LOS DATOS
  // ============================================================
  cargarDatos() {
    if (!this.vendedores || !this.clientes || !this.informesVenta) return;

    const groups: VendedorGrupo[] = [];

    for (const vend of this.vendedores) {

      const informesVendedor = this.informesVenta.filter(
        i => i.idVendedor === vend.idVendedor
      );

      if (informesVendedor.length === 0) continue;

      const clientesGroup: ClienteGrupo[] = [];

      for (const asig of vend.asignaciones) {

        const clienteInfo = this.clientes.find(c => c.idCliente === asig.idCliente);
        if (!clienteInfo) continue;

        const informesCliente = informesVendedor.filter(
          i => i.idCliente === asig.idCliente
        );

        if (informesCliente.length === 0) continue;

        const cantidadOperaciones = informesCliente.length;

        const totalCobrar = informesCliente
          .reduce((acc, i) => acc + i.valoresOp.totalCliente, 0);

        const totalPagar = informesCliente
          .reduce((acc, i) => acc + i.valoresOp.totalChofer, 0);

        const valorComision = (totalCobrar * asig.porcentaje) / 100;

        clientesGroup.push({
          cliente: clienteInfo,
          cantidadOperaciones,
          totalCobrar,
          totalPagar,
          comision: asig.porcentaje,
          valorComision
        });
      }

      if (clientesGroup.length === 0) continue;

      const totalVendedor = clientesGroup.reduce(
        (acc, cg) => acc + cg.valorComision,
        0
      );

      // 🔥 Determinar si TODOS los informes del vendedor tienen pago=true
      const estadoPago = this.calcularPagoVendedor(informesVendedor); // 👈 INSERTADO AQUÍ

      groups.push({
        vendedor: vend,
        clientes: clientesGroup,
        totalVendedor,
        estadoPago
      });

    }

    this.vendedorGrupos = groups;
  }


  // ============================================================
  //   CALCULA VALORES DERIVADOS DEL INFORME
  // ============================================================
  extenderInforme(inf: InformeVenta, porcentaje: number): InformeVentaExtendido {
    const valorComision = (inf.valoresOp.totalCliente * porcentaje) / 100;

    return {
      ...inf,
      porcentajeComision: porcentaje,
      valorComision
    };
  }


  // ============================================================
  //   ACCIONES
  // ============================================================

  verDetalleCliente() {
    
  }

  marcarComoPago(inf: InformeVentaExtendido) {
    console.log('Marcar como pago', inf);
    // acá después hacemos el update Firestore
  }

  private calcularPagoVendedor(
    informesVendedor: InformeVenta[]
  ): boolean {
    if (!informesVendedor || informesVendedor.length === 0) return false;

    return informesVendedor.every(i => i.pago === true);
  }

  private generarResumenVenta(
    vg: VendedorGrupo, 
    informes: ConId<InformeVenta>[], 
    periodo: {
        mes: number;
        anio: number;
    }
  ): ResumenVenta {
  
    const idResumen = new Date().getTime() + Math.floor(Math.random() * 1000);
    const fecha = new Date();

    // ids de los informes
    const idsInfVenta = informes.map(i => i.idInfVenta);

    // Asignaciones extendidas
    const asignacionesExt = vg.vendedor.asignaciones.map(asig => {
      // encontrar los informes de este cliente
      const informesCliente = informes.filter(i => i.idCliente === asig.idCliente);

      const totalCliente = informesCliente.reduce((acc, inf) => acc + inf.valoresOp.totalCliente, 0);

      const totalComision = informesCliente.reduce((acc, inf) => {
        const com = (inf.valoresOp.totalCliente * asig.porcentaje) / 100;
        return acc + com;
      }, 0);

      return {
        ...asig,
        totalCliente,
        totalComision
      };
    });

    // Total a pagar al vendedor
    const total = asignacionesExt.reduce((acc, a) => acc + a.totalComision, 0);

    return {
      idResumen,
      idVendedor: vg.vendedor.idVendedor,
      fecha,
      periodo,
      idsInfVenta,
      asignacionesExt,
      total
    };
  }

  async pagarVendedor(vg: VendedorGrupo) {

    const res = await Swal.fire({
      title: `¿Confirmar pago a ${vg.vendedor.datosPersonales.apellido} ${vg.vendedor.datosPersonales.nombre}?`,
      text: "Esto generará un Resumen de Venta y marcará todas los informes de venta como pagados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, pagar",
      cancelButtonText: "Cancelar"
    });

    if (!res.isConfirmed) return;

    // obtener todos los informes del vendedor
    const informesVendedor = this.informesVenta.filter(
      inf => inf.idVendedor === vg.vendedor.idVendedor
    );

    // 2) generar resumen
     const periodo = this.obtenerPeriodo(this.fechasConsulta);

      const resumen = this.generarResumenVenta(
        vg,
        this.informesVenta.filter(i => i.idVendedor === vg.vendedor.idVendedor),
        periodo
      );

      console.log("ResumenVenta generado:", resumen);

    // 3) modificar los informes localmente
    const informesActualizados = informesVendedor.map(inf => ({
      ...inf,
      pago: true
    }));

    // 4) guardamos el resumen (por ahora simulado)
    //const exitoResumen = await this.guardarResumenLocal(resumen);

    /* if (!exitoResumen) {
      Swal.fire("Error", "No se pudo guardar el resumen.", "error");
      return;
    } */

    // 5) aplicar actualización local
    //this.aplicarActualizacionInformes(informesActualizados);

    Swal.fire("OK", "El vendedor fue pagado correctamente.", "success");
  }

  private obtenerPeriodo(fechas: { fechaDesde: string }) {
    const d = new Date(fechas.fechaDesde);

    return {
      mes: d.getMonth() + 1,   // 1 a 12
      anio: d.getFullYear()    // 2025, etc.
    };
  }
}
