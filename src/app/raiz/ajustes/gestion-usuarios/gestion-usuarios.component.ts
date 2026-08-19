import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Functions, httpsCallable } from '@angular/fire/functions';
import Swal from 'sweetalert2';
import { Usuario } from 'src/app/interfaces/usuario';
import { ColumnaTablaGenerica, AccionTablaGenerica } from 'src/app/interfaces/tabla-generica';
import { GestionUsuariosService } from 'src/app/servicios/gestion-usuarios/gestion-usuarios.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { ModalUsuarioComponent, ResultadoModalUsuario } from './modal-usuario/modal-usuario.component';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: false,
  templateUrl: './gestion-usuarios.component.html',
  styleUrl: './gestion-usuarios.component.scss',
})
export class GestionUsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  filas: any[] = [];
  isLoading = false;

  columnas: ColumnaTablaGenerica[] = [
    { field: 'name', header: 'Nombre', visible: true, width: 220 },
    { field: 'email', header: 'Email', visible: true, width: 260 },
    { field: 'role', header: 'Rol', visible: true, width: 130 },
  ];
  accionesTabla: AccionTablaGenerica[] = [];

  constructor(
    private gestionUsuariosService: GestionUsuariosService,
    private modalService: NgbModal,
    private functions: Functions,
    public usuarioSesion: UsuarioSesionService,
    private logRegistro: LogRegistroService,
  ) {}

  ngOnInit(): void {
    this.accionesTabla = [
      {
        tipo: 'editar',
        handler: (fila) => this.abrirEdicion(fila._objeto),
        disabled: (fila) => this.editarDeshabilitado(fila._objeto),
      },
      {
        tipo: 'eliminar',
        handler: (fila) => this.eliminarUsuario(fila._objeto),
        disabled: (fila) => this.eliminarDeshabilitado(fila._objeto),
      },
    ];

    this.cargarUsuarios();
  }

  async cargarUsuarios(): Promise<void> {
    this.isLoading = true;
    try {
      const todos = await this.gestionUsuariosService.obtenerUsuarios();
      // Los dev no se listan nunca, para nadie (ni siquiera para otro dev).
      this.usuarios = todos.filter((u) => u.role !== 'dev');
      this.armarTabla();
    } catch (error: any) {
      Swal.fire('Error', `No se pudo cargar el listado de usuarios: ${error.message}`, 'error');
    } finally {
      this.isLoading = false;
    }
  }

  armarTabla(): void {
    this.filas = this.usuarios.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      _objeto: u,
    }));
  }

  private editarDeshabilitado(usuario: Usuario): boolean {
    const actual = this.usuarioSesion.getUsuarioActual();
    return (
      usuario.role === 'admin' &&
      this.usuarioSesion.getRol() !== 'dev' &&
      usuario.uid !== actual?.uid
    );
  }

  private eliminarDeshabilitado(usuario: Usuario): boolean {
    const actual = this.usuarioSesion.getUsuarioActual();
    if (usuario.uid === actual?.uid) return true;
    return this.editarDeshabilitado(usuario);
  }

  abrirNuevo(): void {
    const modalRef = this.modalService.open(ModalUsuarioComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
    modalRef.componentInstance.modo = 'alta';
    modalRef.result.then((resultado: ResultadoModalUsuario) => {
      if (resultado?.refrescar) this.cargarUsuarios();
    });
  }

  abrirEdicion(usuario: Usuario): void {
    const modalRef = this.modalService.open(ModalUsuarioComponent, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
    modalRef.componentInstance.modo = 'edicion';
    modalRef.componentInstance.usuario = usuario;
    modalRef.result.then((resultado: ResultadoModalUsuario) => {
      if (!resultado?.refrescar) return;
      this.cargarUsuarios();
      if (resultado.cambioDeRol) {
        Swal.fire(
          'Usuario actualizado',
          'El cambio de rol puede tardar hasta 1 hora en aplicarse, o el usuario puede cerrar sesión y volver a entrar para verlo de inmediato.',
          'success',
        );
      } else {
        Swal.fire('Usuario actualizado', '', 'success');
      }
    });
  }

  eliminarUsuario(usuario: Usuario): void {
    Swal.fire({
      title: '¿Eliminar el usuario?',
      text: 'No se podrá revertir esta acción',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const llamarEliminarUsuario = httpsCallable(this.functions, 'eliminarUsuario');
      llamarEliminarUsuario({ uid: usuario.uid })
        .then(async () => {
          await this.logRegistro.registrarMutacionSuelta(
            'BAJA', 'users', usuario.uid, `Usuario ${usuario.email} eliminado.`,
          );
          Swal.fire('Confirmado', 'El usuario ha sido eliminado', 'success');
          this.cargarUsuarios();
        })
        .catch((error: any) => {
          Swal.fire('Error', error.message, 'error');
        });
    });
  }
}
