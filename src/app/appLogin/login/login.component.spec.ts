import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { LoginComponent } from './login.component';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { MARCA_AVISO_SESION, TEXTO_AVISO_INACTIVIDAD, TEXTO_AVISO_SESION } from 'src/app/servicios/usuario-sesion/sesion-invalida.util';
import { Usuario } from 'src/app/interfaces/usuario';
import { SesionInvalidaService } from 'src/app/servicios/usuario-sesion/sesion-invalida.service';
import { INACTIVIDAD_MAXIMA_MS, MARCA_ULTIMA_ACTIVIDAD } from 'src/app/servicios/usuario-sesion/inactividad.util';

/* Eje de sesión, bloque 3: /login deja de mentir. */
describe('LoginComponent — /login honesto (bloque 3)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let componente: LoginComponent;
  let resolver: () => void;
  let usuarioActual: Usuario | null;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let sesionInvalida: jasmine.SpyObj<SesionInvalidaService>;

  const usuario = { uid: 'X', email: 'x@vantruck.com', role: 'admin' } as Usuario;
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const hayFormulario = () => !!(fixture.nativeElement as HTMLElement).querySelector('input[type="password"]');
  const hayRueda = () => !!(fixture.nativeElement as HTMLElement).querySelector('.spinner-border');

  beforeEach(() => {
    usuarioActual = null;
    const sesionResuelta = new Promise<void>(r => (resolver = r));
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['cerrarSesion', 'iniciarSesion']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    sesionInvalida = jasmine.createSpyObj<SesionInvalidaService>('SesionInvalidaService', ['cerrarSesionForzada']);
    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: SesionInvalidaService, useValue: sesionInvalida },
        {
          provide: UsuarioSesionService,
          useValue: { sesionResuelta: () => sesionResuelta, getUsuarioActual: () => usuarioActual },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    sessionStorage.removeItem(MARCA_AVISO_SESION);
    localStorage.removeItem(MARCA_ULTIMA_ACTIVIDAD);
    spyOn(Swal, 'fire');
    fixture = TestBed.createComponent(LoginComponent);
    componente = fixture.componentInstance;
  });

  afterEach(() => {
    sessionStorage.removeItem(MARCA_AVISO_SESION);
    localStorage.removeItem(MARCA_ULTIMA_ACTIVIDAD);
  });

  async function resolverCon(u: Usuario | null): Promise<void> {
    fixture.detectChanges();          // ngOnInit
    usuarioActual = u;                // lo que dejó la reconciliación
    resolver();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('mientras resuelve: la tarjeta con el spinner, ni formulario ni botones', () => {
    fixture.detectChanges();
    expect(componente.resolviendo).toBeTrue();
    expect(hayRueda()).toBeTrue();
    expect(hayFormulario()).toBeFalse();
    expect(texto()).not.toContain('Continuar');
  });

  it('lee la sesión DESPUÉS de la reconciliación, no antes', async () => {
    usuarioActual = usuario;          // rehidratada, todavía sin reconciliar…
    fixture.detectChanges();
    usuarioActual = null;             // …y la reconciliación la limpió
    resolver();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(componente.sesionViva).toBeNull();
    expect(hayFormulario()).toBeTrue();
  });

  it('con sesión viva: ofrece continuar o cerrar, sin formulario y sin redirigir', async () => {
    await resolverCon(usuario);
    expect(texto()).toContain('Hay una sesión abierta como');
    expect(texto()).toContain('x@vantruck.com');
    expect(hayFormulario()).toBeFalse();
    expect(hayRueda()).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sin sesión: el formulario', async () => {
    await resolverCon(null);
    expect(hayFormulario()).toBeTrue();
    expect(texto()).not.toContain('Hay una sesión abierta');
  });

  it('Continuar navega a /op con el router, sin pasar por /carga', async () => {
    await resolverCon(usuario);
    componente.continuar();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/op']);
  });

  it('Cerrar sesión llama a cerrarSesion y nada más', async () => {
    await resolverCon(usuario);
    componente.cerrarSesion();
    expect(auth.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(componente.sesionViva).toBe(usuario);   // ningún manejo de estado posterior
  });

  it('el aviso del 2c convive: se muestra y la marca se borra, y la sesión se resuelve igual', async () => {
    sessionStorage.setItem(MARCA_AVISO_SESION, '1');
    await resolverCon(null);
    expect(Swal.fire).toHaveBeenCalledOnceWith(jasmine.objectContaining({ text: TEXTO_AVISO_SESION }));
    expect(sessionStorage.getItem(MARCA_AVISO_SESION)).toBeNull();
    expect(hayFormulario()).toBeTrue();
  });

  it('con la marca de inactividad, el texto de inactividad (bloque 4)', async () => {
    sessionStorage.setItem(MARCA_AVISO_SESION, 'inactividad');
    await resolverCon(null);
    expect(Swal.fire).toHaveBeenCalledOnceWith(jasmine.objectContaining({ text: TEXTO_AVISO_INACTIVIDAD }));
    expect(sessionStorage.getItem(MARCA_AVISO_SESION)).toBeNull();
  });

  it('bloque 4: con la marca de actividad vencida no ofrece continuar; cierra por la salida compartida', async () => {
    localStorage.setItem(MARCA_ULTIMA_ACTIVIDAD, String(Date.now() - INACTIVIDAD_MAXIMA_MS - 60_000));
    await resolverCon(usuario);
    expect(sesionInvalida.cerrarSesionForzada).toHaveBeenCalledOnceWith('inactividad');
    expect(texto()).not.toContain('Continuar');
    expect(hayFormulario()).toBeFalse();
    expect(hayRueda()).toBeTrue();                    // spinner hasta la recarga
  });

  it('bloque 4: con la marca al día, ofrece continuar y no cierra nada', async () => {
    localStorage.setItem(MARCA_ULTIMA_ACTIVIDAD, String(Date.now()));
    await resolverCon(usuario);
    expect(sesionInvalida.cerrarSesionForzada).not.toHaveBeenCalled();
    expect(texto()).toContain('Hay una sesión abierta como');
  });

  it('bloque 4: sin sesión, una marca vencida no dispara ningún cierre', async () => {
    localStorage.setItem(MARCA_ULTIMA_ACTIVIDAD, String(Date.now() - INACTIVIDAD_MAXIMA_MS - 60_000));
    await resolverCon(null);
    expect(sesionInvalida.cerrarSesionForzada).not.toHaveBeenCalled();
    expect(hayFormulario()).toBeTrue();
  });

  it('sin marca, no hay aviso', async () => {
    await resolverCon(null);
    expect(Swal.fire).not.toHaveBeenCalled();
  });
});
