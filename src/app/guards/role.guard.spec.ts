import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Route, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { RoleGuard } from './role.guard';
import { UsuarioSesionService } from '../servicios/usuario-sesion/usuario-sesion.service';
import { Usuario, RolUsuario } from '../interfaces/usuario';

describe('RoleGuard', () => {
  let usuarioActual: Usuario | null;
  let resolverSesion: () => void;
  let sesionResuelta: Promise<void>;
  let guard: RoleGuard;
  let router: Router;

  const usuario = (role: RolUsuario): Usuario =>
    ({ uid: 'X', email: 'x@x.com', displayName: '', photoURL: '', emailVerified: true, role, name: 'X' });

  const ruta = (roles?: RolUsuario[]): Route => (roles ? { data: { roles } } : {});
  const snapshot = (roles: RolUsuario[]) => ({ data: { roles } } as unknown as ActivatedRouteSnapshot);
  const estado = {} as RouterStateSnapshot;
  const url = (r: true | UrlTree) => (r === true ? true : router.serializeUrl(r));

  beforeEach(() => {
    usuarioActual = null;
    sesionResuelta = new Promise<void>(r => (resolverSesion = r));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: UsuarioSesionService,
          useValue: { sesionResuelta: () => sesionResuelta, getUsuarioActual: () => usuarioActual },
        },
      ],
    });
    guard = TestBed.inject(RoleGuard);
    router = TestBed.inject(Router);
  });

  describe('canMatch', () => {
    it('con un rol incluido en data.roles → true', async () => {
      usuarioActual = usuario('admin');
      resolverSesion();
      expect(url(await guard.canMatch(ruta(['dev', 'admin']), []))).toBe(true);
    });

    it('sin sesión → /login', async () => {
      resolverSesion();
      expect(url(await guard.canMatch(ruta(['admin']), []))).toBe('/login');
    });

    it('con sesión y un rol no incluido → /limbo', async () => {
      usuarioActual = usuario('demo');
      resolverSesion();
      expect(url(await guard.canMatch(ruta(['dev', 'admin']), []))).toBe('/limbo');
    });

    it('sin data.roles no deja pasar a nadie', async () => {
      usuarioActual = usuario('dev');
      resolverSesion();
      expect(url(await guard.canMatch(ruta(), []))).toBe('/limbo');
    });
  });

  describe('canActivate', () => {
    it('con un rol incluido en data.roles → true', async () => {
      usuarioActual = usuario('manager');
      resolverSesion();
      expect(url(await guard.canActivate(snapshot(['dev', 'admin', 'manager']), estado))).toBe(true);
    });

    it('sin sesión → /login', async () => {
      resolverSesion();
      expect(url(await guard.canActivate(snapshot(['admin']), estado))).toBe('/login');
    });

    it('con sesión y un rol no incluido → /limbo', async () => {
      usuarioActual = usuario('user');
      resolverSesion();
      expect(url(await guard.canActivate(snapshot(['dev', 'admin']), estado))).toBe('/limbo');
    });
  });

  it('no decide mientras sesionResuelta() esté pendiente, y decide con la sesión ya reconciliada', async () => {
    usuarioActual = usuario('demo');                 // rehidratada, todavía sin reconciliar
    let decision: true | UrlTree | undefined;
    guard.canMatch(ruta(['admin']), []).then(r => (decision = r));
    await new Promise(r => setTimeout(r, 0));
    expect(decision).toBeUndefined();

    usuarioActual = usuario('admin');                // la reconciliación corrigió el rol
    resolverSesion();
    await new Promise(r => setTimeout(r, 0));
    expect(decision).toBe(true);
  });
});
