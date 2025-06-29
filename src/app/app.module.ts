import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { environment } from '../environments/environment';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

// LOGIN
import { AuthService } from './servicios/autentificacion/auth.service';
import {
  AuthGuard,
  canActivate,
  redirectLoggedInTo,
  redirectUnauthorizedTo,
} from '@angular/fire/auth-guard';


import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { LoginHeaderComponent } from './appLogin/login-header/login-header.component';
import { LoginComponent } from './appLogin/login/login.component';
import { LogoutComponent } from './appLogin/logout/logout.component';
import { SignUpComponent } from './appLogin/sign-up/sign-up.component';
import { VerifyEmailComponent } from './appLogin/verify-email/verify-email.component';

import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';

import { AdminModule } from './admin/admin.module';
import { SharedModule } from './shared/shared.module';
import { ChoferesModule } from './admin/choferes/choferes.module';
import { OperacionesModule } from './admin/operaciones/operaciones.module';
import { ProveedoresModule } from './admin/proveedores/proveedores.module';
import { FacturacionModule } from './admin/facturacion/facturacion.module';
import { CargaComponent } from './carga/carga.component';
import { CloudinaryModule } from '@cloudinary/ng';
import { LimboComponent } from './limbo/limbo.component';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { AppRoutingModule } from './app-routing.module';
import { AgGridModule } from 'ag-grid-angular';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PagenotfoundComponent,
    LogoutComponent,
    ForgotPasswordComponent,
    VerifyEmailComponent,
    SignUpComponent,
    LoginHeaderComponent,
    CargaComponent,
    LimboComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    NgbModule,
    ReactiveFormsModule,
    CloudinaryModule,
    ChoferesModule,
    AdminModule,
    OperacionesModule,
    SharedModule,
    ProveedoresModule,
    FacturacionModule,
    FilterPipeModule,
    AgGridModule,
    DragDropModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
    
  ],
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    AuthService,
    provideHttpClient(withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
