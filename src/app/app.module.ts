import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';


import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


import { HttpClientModule } from '@angular/common/http';



import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { environment } from '../environments/environment';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';





import { FIREBASE_OPTIONS } from '@angular/fire/compat';

// LOGIN

import { AuthService } from './servicios/autentificacion/auth.service';
import {
  AuthGuard,
  canActivate,
  redirectLoggedInTo,
  redirectUnauthorizedTo,
} from '@angular/fire/auth-guard';




import { AppRoutingModule } from './app-routing.module';
import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { LoginHeaderComponent } from './appLogin/login-header/login-header.component';
import { LoginComponent } from './appLogin/login/login.component';
import { LogoutComponent } from './appLogin/logout/logout.component';
import { SignUpComponent } from './appLogin/sign-up/sign-up.component';
import { VerifyEmailComponent } from './appLogin/verify-email/verify-email.component';

import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';


import { ChoferModule } from './chofer/chofer.module';
import { AdminModule } from './admin/admin.module';
import { SharedModule } from './shared/shared.module';
import { ChoferesModule } from './admin/choferes/choferes.module';
import { OperacionesModule } from './admin/operaciones/operaciones.module';
import { ProveedoresModule } from './admin/proveedores/proveedores.module';





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

   
   
  

    

  ],
  imports: [
    BrowserModule,
    FormsModule,

    AppRoutingModule,
    NgbModule, //se importa la clase RouterModule y se le indica la const donde estan las rutas
    ReactiveFormsModule,
    HttpClientModule,
    ChoferModule,
    ChoferesModule,
    AdminModule,
    OperacionesModule,
    SharedModule,
    ProveedoresModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),

  ],

  providers: [

    AuthService,
    { provide: FIREBASE_OPTIONS, useValue: environment.firebase },

  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
