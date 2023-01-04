import { NgModule } from '@angular/core';
import { redirectUnauthorizedTo, redirectLoggedInTo, canActivate } from '@angular/fire/auth-guard';
import { RouterModule, Routes } from '@angular/router';
import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { LoginComponent } from './appLogin/login/login.component';
import { VerifyEmailComponent } from './appLogin/verify-email/verify-email.component';
import { CajaControlComponent } from './caja/caja-control/caja-control.component';
import { CajaLogComponent } from './caja/caja-log/caja-log.component';
import { ClientesControlComponent } from './clientes/clientes-control/clientes-control.component';
import { FacturacionControlComponent } from './facturacion/facturacion-control/facturacion-control.component';
import { HomeComponent } from './home/home.component';
import { InicioComponent } from './inicio/inicio.component';
import { LogsComponent } from './logs/logs.component';
import { OcupacionComponent } from './ocupacion/ocupacion.component';
import { PerfilEmpresaComponent } from './perfil-empresa/perfil-empresa.component';
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario.component';
import { PlayaControlComponent } from './playa/playa-control/playa-control.component';
import { TarifasControlComponent } from './tarifas/tarifas-control/tarifas-control.component';

// const routes: Routes = [];

//se crea una const del tipo Routes para guardar todas las rutas
//esto importa la clase Routes
const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login']);
const redirectLoggedInToHome = () => redirectLoggedInTo(['home']);

const appRoutes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'home',
    component: HomeComponent,
    ...canActivate(redirectUnauthorizedToLogin),
    children: [
      {
        path: '',
        redirectTo: 'playa',
        pathMatch: 'full',
      },
      {
        path: 'playa',
        component: PlayaControlComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'facturacion',
        component: FacturacionControlComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'caja',
        component: CajaControlComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'tarifas',
        component: TarifasControlComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'clientes',
        component: ClientesControlComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'ocupacion',
        component: OcupacionComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'logs',
        component: LogsComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'usuario',
        component: PerfilUsuarioComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'empresa',
        component: PerfilEmpresaComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'cajaLog',
        component: CajaLogComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
    ],
  },
  { path: 'login', component: LoginComponent }, // la ruta al login
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-email-address', component: VerifyEmailComponent },
  {
    path: 'inicio',
    component: InicioComponent,
    ...canActivate(redirectUnauthorizedToLogin),
  },
];



@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

