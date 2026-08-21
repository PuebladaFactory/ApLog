import { Component, OnInit } from '@angular/core';
import { DocumentData, QueryDocumentSnapshot } from '@angular/fire/firestore';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { PapeleraEvento } from 'src/app/interfaces/registro-papelera';
import { ModuloPermiso } from 'src/app/interfaces/permiso';
import { PapeleraConsultaService } from 'src/app/servicios/papelera/papelera-consulta.service';
import { PapeleraService } from 'src/app/servicios/papelera/papelera.service';
import { VisualizadorObjetoService } from 'src/app/servicios/visualizador-objeto/visualizador-objeto.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { OperacionService } from 'src/app/servicios/operaciones/operacion.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

/** Pantalla nueva de papelera, basada en el mecanismo por referencia
 *  (PapeleraEvento/objetosEliminados, ver CLAUDE.md → "Frente Papelera") — SOLO
 *  para Cliente/Chofer/Proveedor/Operación, los 4 módulos ya migrados. El resto
 *  (Vendedores/Facturación/Liquidación) sigue en PapeleraLegadoComponent, sin
 *  cambios. */
@Component({
  selector: 'app-papelera',
  templateUrl: './papelera.component.html',
  styleUrls: ['./papelera.component.scss'],
  standalone: false,
})
export class PapeleraComponent implements OnInit {

  // ---- Filtros server-side ----
  fechaDesde = '';
  fechaHasta = '';
  estadoFiltro: 'activo' | 'restaurado' = 'activo';

  // ---- Estado de paginación ----
  eventos: ConId<PapeleraEvento>[] = [];
  private cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  hayMas = false;
  cargando = false;

  private usuariosTodos: any[] = [];

  constructor(
    private consultaServ: PapeleraConsultaService,
    private papeleraService: PapeleraService,
    public visualizador: VisualizadorObjetoService,
    private clienteService: ClienteService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private operacionService: OperacionService,
    private storageService: StorageService,
    public usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    this.usuariosTodos = this.storageService.loadInfo('users');
    this.calcularRangoDefault();
    this.buscar();
  }

  /** Default: último mes — rango más amplio que Registro Log porque una baja
   *  suele consultarse bastante después del hecho. */
  private calcularRangoDefault(): void {
    const hoy = new Date();
    const haceUnMes = new Date(hoy);
    haceUnMes.setMonth(hoy.getMonth() - 1);
    this.fechaHasta = hoy.toISOString().split('T')[0];
    this.fechaDesde = haceUnMes.toISOString().split('T')[0];
  }

  async buscar(): Promise<void> {
    this.eventos = [];
    this.cursor = null;
    this.hayMas = false;
    await this.cargarPagina();
  }

  async cargarMas(): Promise<void> {
    await this.cargarPagina();
  }

  private async cargarPagina(): Promise<void> {
    if (this.cargando || !this.fechaDesde || !this.fechaHasta) return;
    this.cargando = true;
    try {
      const desde = new Date(`${this.fechaDesde}T00:00:00`).getTime();
      const hasta = new Date(`${this.fechaHasta}T23:59:59.999`).getTime();
      const pagina = await this.consultaServ.cargarPagina(desde, hasta, this.cursor, this.estadoFiltro);
      this.eventos = [...this.eventos, ...pagina.items];
      this.cursor = pagina.cursor;
      this.hayMas = pagina.hayMas;
    } catch (e: any) {
      Swal.fire('Error', `No se pudo consultar la papelera: ${e?.message ?? e}`, 'error');
    } finally {
      this.cargando = false;
    }
  }

  getUsuario(email: string): string {
    const usuario = this.usuariosTodos.find(u => u.email === email);
    return usuario ? (usuario.name !== '' ? usuario.name : usuario.email) : email;
  }

  getFecha(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hour12: false, minute: '2-digit', second: '2-digit',
    });
  }

  /** Refs secundarias (principal:false) como resumen en línea — sin modal propio,
   *  mismo criterio que hoy con vehículos/legajos en el modal viejo. */
  secundarios(evento: PapeleraEvento): string {
    const secundarios = evento.refs.filter(r => !r.principal);
    if (secundarios.length === 0) return '—';
    return secundarios.map(r => `${r.coleccion}: ${r.idOriginal}`).join(', ');
  }

  moduloDe(evento: PapeleraEvento): ModuloPermiso {
    // Cast deliberado, mismo criterio que RegistroLogComponent.moduloDe.
    return evento.coleccionPrincipal as ModuloPermiso;
  }

  /** Detalle del objeto principal: snapshot archivado si el evento sigue 'activo'
   *  (el objeto ya no existe en su colección de origen), objeto vivo si ya fue
   *  'restaurado' (undefined → VisualizadorObjetoService hace getById normal). */
  async verObjeto(evento: ConId<PapeleraEvento>): Promise<void> {
    let snapshot: any = undefined;
    if (evento.estado === 'activo') {
      snapshot = await this.papeleraService.getObjetoEliminado<any>(evento.coleccionPrincipal, evento.idPrincipal);
    }
    await this.visualizador.verObjeto(evento.coleccionPrincipal, evento.idPrincipal, snapshot);
  }

  puedeRestaurar(evento: PapeleraEvento): boolean {
    return evento.estado === 'activo' && !this.usuarioSesion.esRol('demo');
  }

  async restaurar(evento: ConId<PapeleraEvento>): Promise<void> {
    if (!this.puedeRestaurar(evento)) return;

    const confirmacion = await Swal.fire({
      title: '¿Restaurar este objeto?',
      text: 'Tenga en cuenta las relaciones entre objetos (ej. un chofer puede pertenecer a un proveedor) al restaurar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.cargando = true;
    try {
      switch (evento.coleccionPrincipal) {
        case 'clientes':
          await this.clienteService.restaurarCliente(evento.id);
          break;
        case 'choferes':
          await this.choferService.restaurarChofer(evento.id);
          break;
        case 'proveedores':
          await this.proveedorService.restaurarProveedor(evento.id);
          break;
        case 'operaciones': {
          const resultado = await this.operacionService.restaurarOperacion(evento.id);
          if (!resultado.exito) throw new Error(resultado.mensaje);
          break;
        }
        default:
          throw new Error(`Colección principal sin restaurador conocido: ${evento.coleccionPrincipal}`);
      }
      Swal.fire('Confirmado', 'El objeto ha sido restaurado.', 'success');
      await this.buscar();
    } catch (e: any) {
      Swal.fire('Error', `No se pudo restaurar: ${e?.message ?? e}`, 'error');
    } finally {
      this.cargando = false;
    }
  }
}
