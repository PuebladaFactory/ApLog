import { NgModule } from '@angular/core';
import { redirectUnauthorizedTo, redirectLoggedInTo, canActivate } from '@angular/fire/auth-guard';
import { RouterModule, Routes } from '@angular/router';
import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { LoginComponent } from './appLogin/login/login.component';
import { VerifyEmailComponent } from './appLogin/verify-email/verify-email.component';
import { SignUpComponent } from './appLogin/sign-up/sign-up.component';
import { CargaComponent } from './carga/carga.component';
import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';
import { RoleGuard } from './guards/role.guard';
import { LimboComponent } from './limbo/limbo.component';



const appRoutes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'raiz', loadChildren: () => import('./raiz/raiz.module').then(m => m.RaizModule)},  
  { path: 'carga', component: CargaComponent }, 
  { path: 'login', component: LoginComponent }, // la ruta al login
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-email-address', component: VerifyEmailComponent },
  { path: 'register-user', component: SignUpComponent},
  { path: 'unauthorized', component: PagenotfoundComponent},
  { path: 'limbo', component: LimboComponent}
];



@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

