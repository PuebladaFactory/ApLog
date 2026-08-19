import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { RolUsuario, Usuario } from 'src/app/interfaces/usuario';
import { CambioCampo } from 'src/app/interfaces/registro-log';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';

type VistaModal = 'formulario' | 'exito' | 'cambioEmail';

// Mismo array que ROLES_ASIGNABLES en functions/src/gestionUsuarios.ts (sin 'dev').
const ROLES_ASIGNABLES: RolUsuario[] = ['admin', 'manager', 'user', 'demo'];

interface CrearUsuarioPayload {
  email: string;
  name: string;
  role: RolUsuario;
}

interface CrearUsuarioResponse {
  uid: string;
  link: string;
}

interface EditarUsuarioPayload {
  uid: string;
  name?: string;
  role?: RolUsuario;
}

interface EditarEmailPayload {
  uid: string;
  nuevoEmail: string;
}

interface EditarEmailResponse {
  link: string;
}

export interface ResultadoModalUsuario {
  refrescar: boolean;
  cambioDeRol?: boolean;
}

@Component({
  selector: 'app-modal-usuario',
  standalone: false,
  templateUrl: './modal-usuario.component.html',
  styleUrl: './modal-usuario.component.scss',
})
export class ModalUsuarioComponent implements OnInit {
  @Input() modo!: 'alta' | 'edicion';
  @Input() usuario?: Usuario;

  vista: VistaModal = 'formulario';
  rolesAsignables = ROLES_ASIGNABLES;

  form!: FormGroup;
  rolDeshabilitado = false;

  cargando = false;
  errorMsg = '';

  link = '';
  copiado = false;
  yaCopioAlgunaVez = false;

  nuevoEmail = '';
  errorEmail = '';
  esCambioEmailPropio = false;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private functions: Functions,
    private usuarioSesion: UsuarioSesionService,
    private authService: AuthService,
    private logRegistro: LogRegistroService,
  ) {}

  ngOnInit(): void {
    if (this.modo === 'alta') {
      this.form = this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        role: ['', Validators.required],
      });
    } else {
      this.rolDeshabilitado = this.usuario?.uid === this.usuarioSesion.getUsuarioActual()?.uid;
      this.form = this.fb.group({
        name: [this.usuario?.name ?? '', Validators.required],
        role: [
          { value: this.usuario?.role ?? '', disabled: this.rolDeshabilitado },
          Validators.required,
        ],
      });
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.errorMsg = '';
    this.cargando = true;

    try {
      if (this.modo === 'alta') {
        const llamarCrearUsuario = httpsCallable<CrearUsuarioPayload, CrearUsuarioResponse>(
          this.functions,
          'crearUsuario',
        );
        const resultado = await llamarCrearUsuario(this.form.value);
        await this.logRegistro.registrarMutacionSuelta(
          'ALTA', 'users', resultado.data.uid,
          `Usuario ${this.form.value.email} creado (rol: ${this.form.value.role}).`,
        );
        this.link = resultado.data.link;
        this.vista = 'exito';
      } else {
        const payload: EditarUsuarioPayload = {
          uid: this.usuario!.uid,
          name: this.form.value.name,
        };
        if (!this.rolDeshabilitado) {
          payload.role = this.form.value.role;
        }
        const llamarEditarUsuario = httpsCallable<EditarUsuarioPayload, { ok: boolean }>(
          this.functions,
          'editarUsuario',
        );
        await llamarEditarUsuario(payload);

        const cambios: CambioCampo[] = [];
        if (this.usuario!.name !== payload.name) {
          cambios.push({ campo: 'name', anterior: this.usuario!.name, nuevo: payload.name });
        }
        if (!this.rolDeshabilitado && this.usuario!.role !== payload.role) {
          cambios.push({ campo: 'role', anterior: this.usuario!.role, nuevo: payload.role });
        }
        await this.logRegistro.registrarMutacionSuelta(
          'EDITAR', 'users', this.usuario!.uid, `Usuario ${this.usuario!.email} editado.`, cambios,
        );

        this.activeModal.close({ refrescar: true, cambioDeRol: !this.rolDeshabilitado });
      }
    } catch (error: any) {
      this.errorMsg = error.message;
    } finally {
      this.cargando = false;
    }
  }

  abrirCambioEmail(): void {
    this.nuevoEmail = '';
    this.errorEmail = '';
    this.vista = 'cambioEmail';
  }

  async confirmarCambioEmail(): Promise<void> {
    this.errorEmail = '';
    this.cargando = true;

    try {
      const llamarEditarEmail = httpsCallable<EditarEmailPayload, EditarEmailResponse>(
        this.functions,
        'editarEmailUsuario',
      );
      const resultado = await llamarEditarEmail({
        uid: this.usuario!.uid,
        nuevoEmail: this.nuevoEmail,
      });
      await this.logRegistro.registrarMutacionSuelta(
        'EDITAR', 'users', this.usuario!.uid,
        `Email actualizado de ${this.usuario!.email} a ${this.nuevoEmail}.`,
        [{ campo: 'email', anterior: this.usuario!.email, nuevo: this.nuevoEmail }],
      );
      this.link = resultado.data.link;
      // Firebase revoca el refresh token del usuario afectado en cualquier
      // cambio de email/contraseña. Si el afectado es quien está usando
      // este modal, su propia sesión va a caer al continuar.
      this.esCambioEmailPropio = this.usuario?.uid === this.usuarioSesion.getUsuarioActual()?.uid;
      this.vista = 'exito';
    } catch (error: any) {
      this.errorEmail = error.message;
    } finally {
      this.cargando = false;
    }
  }

  copiarLink(): void {
    navigator.clipboard.writeText(this.link).then(() => {
      this.copiado = true;
      this.yaCopioAlgunaVez = true;
      setTimeout(() => {
        this.copiado = false;
      }, 2000);
    });
  }

  cerrarConExito(): void {
    if (this.esCambioEmailPropio) {
      // La sesión propia se cierra: no hay tabla para refrescar del otro lado.
      this.activeModal.close({ refrescar: false });
      this.authService.cerrarSesion();
    } else {
      this.activeModal.close({ refrescar: true });
    }
  }
}
