import { Component, OnInit } from '@angular/core';
import { DocumentData, QueryDocumentSnapshot } from '@angular/fire/firestore';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { AccionLog, RegistroLog } from 'src/app/interfaces/registro-log';
import { ModuloPermiso } from 'src/app/interfaces/permiso';
import {
  COLECCIONES_REGISTRO_LOG,
  RegistroLogConsultaService,
} from 'src/app/servicios/log-registro/registro-log-consulta.service';
import { VisualizadorObjetoService } from 'src/app/servicios/visualizador-objeto/visualizador-objeto.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-registro-log',
  templateUrl: './registro-log.component.html',
  styleUrls: ['./registro-log.component.scss'],
  standalone: false,
})
export class RegistroLogComponent implements OnInit {

  readonly colecciones = COLECCIONES_REGISTRO_LOG;
  readonly acciones: AccionLog[] = ['ALTA', 'EDITAR', 'BAJA', 'RESTAURAR', 'REIMPRIMIR', 'DESCARGAR', 'LOGIN', 'LOGOUT'];

  // ---- Filtros server-side (disparan una consulta nueva a Firestore) ----
  fechaDesde = '';
  fechaHasta = '';
  coleccionFiltro = '';

  // ---- Filtros client-side (se aplican sobre `registros`, ya cargado en memoria —
  // NO traen más resultados del servidor; si no hay matches, hay que "Cargar más"
  // para ampliar la ventana de fechas explorada) ----
  filtroAccion = '';
  filtroUsuario = '';
  filtroStatus = '';

  // ---- Estado de paginación ----
  registros: ConId<RegistroLog>[] = [];
  private cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  hayMas = false;
  cargando = false;

  // ---- Fila expandida (diff de EDITAR) ----
  filaExpandidaId: string | null = null;

  // ---- Consulta puntual por idObjet (capacidad secundaria, barata) ----
  idObjConsulta = '';
  modoConsultaPorId = false;

  private usuariosTodos: any[] = [];

  constructor(
    private consultaServ: RegistroLogConsultaService,
    private storageService: StorageService,
    public visualizador: VisualizadorObjetoService,
  ) {}

  ngOnInit(): void {
    this.usuariosTodos = this.storageService.loadInfo('users');
    this.calcularRangoDefault();
    this.buscar();
  }

  /** Default: última semana. */
  private calcularRangoDefault(): void {
    const hoy = new Date();
    const haceUnaSemana = new Date(hoy);
    haceUnaSemana.setDate(hoy.getDate() - 7);
    this.fechaHasta = hoy.toISOString().split('T')[0];
    this.fechaDesde = haceUnaSemana.toISOString().split('T')[0];
  }

  async buscar(): Promise<void> {
    this.modoConsultaPorId = false;
    this.registros = [];
    this.cursor = null;
    this.hayMas = false;
    this.filaExpandidaId = null;
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
      const pagina = await this.consultaServ.cargarPagina(
        desde, hasta, this.cursor, this.coleccionFiltro || undefined,
      );
      this.registros = [...this.registros, ...pagina.items];
      this.cursor = pagina.cursor;
      this.hayMas = pagina.hayMas;
    } catch (e: any) {
      Swal.fire('Error', `No se pudo consultar el registro: ${e?.message ?? e}`, 'error');
    } finally {
      this.cargando = false;
    }
  }

  async consultarPorIdObjet(): Promise<void> {
    if (!this.idObjConsulta) return;
    this.cargando = true;
    try {
      this.registros = await this.consultaServ.consultarPorIdObjet(this.idObjConsulta);
      this.modoConsultaPorId = true;
      this.cursor = null;
      this.hayMas = false;
      this.filaExpandidaId = null;
    } catch (e: any) {
      Swal.fire('Error', `No se pudo consultar por id: ${e?.message ?? e}`, 'error');
    } finally {
      this.cargando = false;
    }
  }

  get registrosFiltrados(): ConId<RegistroLog>[] {
    const usuarioBuscado = this.filtroUsuario.trim().toLowerCase();
    return this.registros.filter(r =>
      (!this.filtroAccion || r.action === this.filtroAccion) &&
      (!this.filtroStatus || r.status === this.filtroStatus) &&
      (!usuarioBuscado || r.userEmail.toLowerCase().includes(usuarioBuscado)),
    );
  }

  esExpandible(r: RegistroLog): boolean {
    return r.action === 'EDITAR' && !!r.cambios && r.cambios.length > 0;
  }

  toggleExpandir(r: ConId<RegistroLog>): void {
    if (!this.esExpandible(r)) return;
    this.filaExpandidaId = this.filaExpandidaId === r.id ? null : r.id;
  }

  estaExpandida(r: ConId<RegistroLog>): boolean {
    return this.filaExpandidaId === r.id;
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

  verObjeto(r: RegistroLog): void {
    this.visualizador.verObjeto(r.coleccion, r.idObjet);
  }

  moduloDe(r: RegistroLog): ModuloPermiso {
    // Cast deliberado: r.coleccion es la colección real de Firestore, que para
    // las colecciones con ModuloPermiso real coincide 1:1 (clientes/choferes/
    // proveedores/operaciones/legajos). Para colecciones sin correspondencia
    // (users, vehiculos, asignaciones, categoriasDocumentacion), el cast no
    // corresponde a ningún ModuloPermiso real — inofensivo: PermisosService.puede()
    // devuelve false de forma segura (encadenamiento opcional en
    // matrizBase[moduloReal]?.[...]) y el botón simplemente no se renderiza
    // (visible=false en BtnLeerComponent).
    return r.coleccion as ModuloPermiso;
  }
}
