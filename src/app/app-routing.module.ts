import { NgModule } from '@angular/core';
import { redirectUnauthorizedTo, redirectLoggedInTo, canActivate } from '@angular/fire/auth-guard';
import { RouterModule, Routes } from '@angular/router';
import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { LoginComponent } from './appLogin/login/login.component';
import { VerifyEmailComponent } from './appLogin/verify-email/verify-email.component';
import { HomeComponent } from './home/home.component';
import { PerfilEmpresaComponent } from './perfil-empresa/perfil-empresa.component';
import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario.component';

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
        path: 'usuario',
        component: PerfilUsuarioComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },
      {
        path: 'empresa',
        component: PerfilEmpresaComponent,
        ...canActivate(redirectUnauthorizedToLogin),
      },

    ],
  },
  { path: 'login', component: LoginComponent }, // la ruta al login
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-email-address', component: VerifyEmailComponent },

];



@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

