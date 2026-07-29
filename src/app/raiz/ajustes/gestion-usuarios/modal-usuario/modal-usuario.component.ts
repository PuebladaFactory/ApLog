import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { RolUsuario, Usuario } from 'src/app/interfaces/usuario';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';

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
        this.activeModal.close(true);
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
      this.authService.cerrarSesion();
    } else {
      this.activeModal.close(true);
    }
  }
}
