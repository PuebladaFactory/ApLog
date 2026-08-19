import { inject, Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ClienteAltaComponent } from 'src/app/raiz/clientes/cliente-alta/cliente-alta.component';
import { ChoferesAltaComponent } from 'src/app/raiz/choferes/choferes-alta/choferes-alta.component';
import { ProveedoresAltaComponent } from 'src/app/raiz/proveedores/proveedores-alta/proveedores-alta.component';
import { ModalResumenOpComponent } from 'src/app/raiz/operaciones/modal-resumen-op/modal-resumen-op.component';

interface HandlerVisualizador {
  componente: any;
  /** Campo idXxx que el modal de esa entidad espera en `fromParent.item` (además de `id`). */
  idField: string;
  tamano: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Dispatcher de "ver objeto" para pantallas que solo tienen `coleccion` + `idObjet`
 * (hoy: RegistroLogComponent; pensado para reusarse en Papelera más adelante — frente
 * aparte, no conectado todavía). Deliberadamente "tonto respecto al dominio" en el
 * sentido inverso a LogRegistroService: no conoce el mecanismo de log, solo sabe abrir
 * el modal de alta/edición real de cada entidad en modo 'vista' (solo lectura) con el
 * objeto ACTUAL — no reconstruye ni conoce el estado histórico de la acción de log.
 *
 * Mapeo deliberadamente simple (Record<coleccion, handler>) — ver CLAUDE.md → pantalla
 * RegistroLog para el criterio de qué colección entra y cuál no.
 */
@Injectable({ providedIn: 'root' })
export class VisualizadorObjetoService {
  private modalService = inject(NgbModal);
  private db = inject(DbFirestoreService);

  private readonly mapeo: Record<string, HandlerVisualizador> = {
    clientes: { componente: ClienteAltaComponent, idField: 'idCliente', tamano: 'lg' },
    choferes: { componente: ChoferesAltaComponent, idField: 'idChofer', tamano: 'lg' },
    proveedores: { componente: ProveedoresAltaComponent, idField: 'idProveedor', tamano: 'lg' },
    operaciones: { componente: ModalResumenOpComponent, idField: 'idOperacion', tamano: 'lg' },
  };

  /** true si `coleccion` tiene un modal de vista mapeado — el caller usa esto para
   *  deshabilitar el botón "ver objeto" sin intentar abrir nada. */
  puedeVer(coleccion: string): boolean {
    return coleccion in this.mapeo;
  }

  /** Busca el objeto ACTUAL (no un snapshot del momento del log) y abre su modal de
   *  alta/edición real en modo 'vista'. No hace nada si `coleccion` no está mapeada
   *  (el caller ya debería haber deshabilitado el botón) ni si el objeto ya no existe
   *  (fue dado de baja después de este registro) — en ese caso avisa con un mensaje. */
  async verObjeto(coleccion: string, idObjet: string | number): Promise<void> {
    const handler = this.mapeo[coleccion];
    if (!handler) return;

    const id = String(idObjet);
    const data = await this.db.getById<any>(coleccion, id);
    if (!data) {
      Swal.fire({
        icon: 'info',
        title: 'Objeto no encontrado',
        text: 'Este objeto ya no existe — probablemente fue dado de baja después de este registro de log.',
      });
      return;
    }

    Swal.fire({
      icon: 'info',
      title: 'Estado actual',
      text: 'Se muestra el estado ACTUAL del objeto, no una foto del momento de esta acción.',
      timer: 2500,
      timerProgressBar: true,
      showConfirmButton: false,
    });

    const item = { ...data, id, type: '', [handler.idField]: id };
    const modalRef = this.modalService.open(handler.componente, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: handler.tamano,
    });
    modalRef.componentInstance.fromParent = { modo: 'vista', item };
  }
}
