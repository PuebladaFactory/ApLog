import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { LoginComponent } from './appLogin/login/login.component';
import { CargaComponent } from './carga/carga.component';
import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';
import { LimboComponent } from './limbo/limbo.component';



const appRoutes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  // Frente lazy-fechas (LZ1): RaizModule se carga lazy montado en '' (al
  // final de este array) y las URLs siguen siendo /op, /clientes, ...
  // Compatibilidad con las URLs viejas: /raiz → /op; /raiz/x → /x.
  { path: 'raiz', redirectTo: '/op', pathMatch: 'full' },
  { path: 'raiz', redirectTo: '' },
  { path: 'carga', component: CargaComponent }, 
  { path: 'login', component: LoginComponent }, // la ruta al login
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'unauthorized', component: PagenotfoundComponent},
  { path: 'limbo', component: LimboComponent},
  // App principal (HomeComponent + sidebar + módulos de feature). Va AL
  // FINAL: las rutas de arriba tienen prioridad.
  { path: '', loadChildren: () => import('./raiz/raiz.module').then(m => m.RaizModule) },
  // Cualquier otra URL: "¡Ups!" con botón Volver (antes: NG04002 y
  // pantalla en blanco).
  { path: '**', component: PagenotfoundComponent },
];



@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

