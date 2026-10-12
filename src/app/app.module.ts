import { LOCALE_ID, NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { environment } from '../environments/environment';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { provideStorage, getStorage } from '@angular/fire/storage';

// LOGIN
import { AuthService } from './servicios/autentificacion/auth.service';


import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { LoginHeaderComponent } from './appLogin/login-header/login-header.component';
import { LoginComponent } from './appLogin/login/login.component';

import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';


import { CargaComponent } from './carga/carga.component';
import { LimboComponent } from './limbo/limbo.component';
import { AppRoutingModule } from './app-routing.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es'; // Importa los datos en español

// Registra los datos del locale en español
registerLocaleData(localeEs);

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PagenotfoundComponent,
    ForgotPasswordComponent,
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
    ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: !isDevMode(),
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000'
    }),
],
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideFunctions(() => getFunctions(undefined, environment.functionsRegion)),
    provideStorage(() => getStorage()),
    AuthService,
    provideHttpClient(withInterceptorsFromDi()),
     { provide: LOCALE_ID, useValue: 'es' } // Establece el español como locale
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
