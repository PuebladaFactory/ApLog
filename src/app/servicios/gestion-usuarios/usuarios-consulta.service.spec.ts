import { RolUsuario, Usuario } from 'src/app/interfaces/usuario';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';
import { GestionUsuariosService } from './gestion-usuarios.service';
import { UsuariosConsultaService } from './usuarios-consulta.service';

function usuario(cambios: Partial<Usuario> = {}): Usuario {
  return {
    uid: 'u1',
    email: 'ana@vantruck.com',
    displayName: '',
    photoURL: '',
    emailVerified: true,
    role: 'admin',
    name: 'Ana',
    ...cambios,
  };
}

describe('UsuariosConsultaService', () => {
  let gestion: jasmine.SpyObj<GestionUsuariosService>;
  let sesion: jasmine.SpyObj<UsuarioSesionService>;
  let servicio: UsuariosConsultaService;

  // PermisosService real sobre la sesión simulada: el caso prueba la regla de
  // lectura de /users (usuarios.ver), no una lista copiada.
  function conRol(rol: RolUsuario): void {
    sesion.getRol.and.returnValue(rol);
  }

  beforeEach(() => {
    gestion = jasmine.createSpyObj<GestionUsuariosService>('GestionUsuariosService', ['obtenerUsuarios']);
    sesion = jasmine.createSpyObj<UsuarioSesionService>('UsuarioSesionService', ['getRol']);
    servicio = new UsuariosConsultaService(gestion, new PermisosService(sesion));
  });

  it('con rol demo no consulta Firestore y muestra el email', async () => {
    conRol('demo');
    await servicio.cargar();
    expect(gestion.obtenerUsuarios).not.toHaveBeenCalled();
    expect(servicio.nombreDe('u1', 'ana@vantruck.com')).toBe('ana@vantruck.com');
  });

  it('con rol admin lee /users y resuelve el nombre', async () => {
    conRol('admin');
    gestion.obtenerUsuarios.and.resolveTo([usuario()]);
    await servicio.cargar();
    expect(gestion.obtenerUsuarios).toHaveBeenCalledTimes(1);
    expect(servicio.nombreDe('u1', 'ana@vantruck.com')).toBe('Ana');
  });

  it('userId gana sobre userEmail', async () => {
    conRol('dev');
    gestion.obtenerUsuarios.and.resolveTo([
      usuario({ uid: 'u1', email: 'viejo@vantruck.com', name: 'Por uid' }),
      usuario({ uid: 'u2', email: 'ana@vantruck.com', name: 'Por email' }),
    ]);
    await servicio.cargar();
    expect(servicio.nombreDe('u1', 'ana@vantruck.com')).toBe('Por uid');
  });

  it('si el userId no resuelve, busca por userEmail', async () => {
    conRol('admin');
    gestion.obtenerUsuarios.and.resolveTo([usuario({ uid: 'u2', name: 'Por email' })]);
    await servicio.cargar();
    expect(servicio.nombreDe('Desconocido', 'ana@vantruck.com')).toBe('Por email');
  });

  it('un usuario resuelto sin name (vacío, undefined o espacios) cae al email', async () => {
    conRol('admin');
    const sinName = usuario({ uid: 'u3', email: 'c@vantruck.com' });
    delete (sinName as Partial<Usuario>).name;
    gestion.obtenerUsuarios.and.resolveTo([
      usuario({ uid: 'u1', email: 'a@vantruck.com', name: '' }),
      usuario({ uid: 'u2', email: 'b@vantruck.com', name: '   ' }),
      sinName,
    ]);
    await servicio.cargar();
    expect(servicio.nombreDe('u1', 'a@vantruck.com')).toBe('a@vantruck.com');
    expect(servicio.nombreDe('u2', 'b@vantruck.com')).toBe('b@vantruck.com');
    expect(servicio.nombreDe('u3', 'c@vantruck.com')).toBe('c@vantruck.com');
  });

  it('un usuario inexistente cae al email, o a "" si tampoco hay email', async () => {
    conRol('admin');
    gestion.obtenerUsuarios.and.resolveTo([usuario()]);
    await servicio.cargar();
    expect(servicio.nombreDe('otro', 'otro@vantruck.com')).toBe('otro@vantruck.com');
    expect(servicio.nombreDe(undefined, undefined)).toBe('');
  });

  it('una lectura que falla no lanza y cae al email', async () => {
    conRol('admin');
    gestion.obtenerUsuarios.and.rejectWith(new Error('permission-denied'));
    spyOn(console, 'error');
    await expectAsync(servicio.cargar()).toBeResolved();
    expect(console.error).toHaveBeenCalled();
    expect(servicio.nombreDe('u1', 'ana@vantruck.com')).toBe('ana@vantruck.com');
  });

  it('una lectura que falla después de una buena deja sin resolución', async () => {
    conRol('admin');
    gestion.obtenerUsuarios.and.resolveTo([usuario()]);
    await servicio.cargar();
    gestion.obtenerUsuarios.and.rejectWith(new Error('red'));
    spyOn(console, 'error');
    await servicio.cargar();
    expect(servicio.nombreDe('u1', 'ana@vantruck.com')).toBe('ana@vantruck.com');
  });

  it('llamadas superpuestas comparten una sola lectura', async () => {
    conRol('admin');
    gestion.obtenerUsuarios.and.resolveTo([usuario()]);
    await Promise.all([servicio.cargar(), servicio.cargar()]);
    expect(gestion.obtenerUsuarios).toHaveBeenCalledTimes(1);
  });
});
