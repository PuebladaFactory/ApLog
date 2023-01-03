import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';


import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HomeComponent } from './home/home.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


import { HttpClientModule } from '@angular/common/http';

import { PlayaFormComponent } from './playa/playa-form/playa-form.component';
import { FilterPipe } from './servicios/filter.pipe';

import { PagenotfoundComponent } from './pagenotfound/pagenotfound.component';
import { ClientesFormComponent } from './clientes/clientes-form/clientes-form.component';
import { PlayaViewComponent } from './playa/playa-view/playa-view.component';
import { PlayaControlComponent } from './playa/playa-control/playa-control.component';
import { ClientesViewComponent } from './clientes/clientes-view/clientes-view.component';
import { ClientesControlComponent } from './clientes/clientes-control/clientes-control.component';

import { TicketEntradaComponent } from './ticket-entrada/ticket-entrada.component';
import { NgxPrintElementModule } from 'ngx-print-element';
import { NgxBarcode6Module } from 'ngx-barcode6';
import { BtnReimpresionComponent } from './shared/btn-reimpresion/btn-reimpresion.component';
import { TarifasControlComponent } from './tarifas/tarifas-control/tarifas-control.component';
import { TarifasViewComponent } from './tarifas/tarifas-view/tarifas-view.component';
import { TarifasFormComponent } from './tarifas/tarifas-form/tarifas-form.component';

import { FacturacionControlComponent } from './facturacion/facturacion-control/facturacion-control.component';
import { FacturacionViewComponent } from './facturacion/facturacion-view/facturacion-view.component';
import { FacturacionFormComponent } from './facturacion/facturacion-form/facturacion-form.component';
import { InicioComponent } from './inicio/inicio.component';
import { VehiculosFormComponent } from './clientes/vehiculos-form/vehiculos-form.component';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { environment } from '../environments/environment';
import { ConsultaFacturacionComponent } from './facturacion/consulta-facturacion/consulta-facturacion.component';
import { CustomAdapterService } from './servicios/Fechas/calendario/custom-adapter.service';
import { CustomDateParserFormatterService } from './servicios/Fechas/calendario/custom-date-parser-formatter.service';
import { NgbTimeStringAdapterService } from './servicios/Fechas/calendario/ngb-time-string-adapter.service';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { ScannerComponent } from './scanner/scanner.component';

// LOGS //
import { LogsComponent } from './logs/logs.component';
import { LogService } from './servicios/log.service';

import { SpinnerComponent } from './spinner/spinner.component';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';

// LOGIN
import { LoginComponent } from './appLogin/login/login.component';
import { LogoutComponent } from './appLogin/logout/logout.component';
import { AuthService } from './servicios/autentificacion/auth.service';
import {
  AuthGuard,
  canActivate,
  redirectLoggedInTo,
  redirectUnauthorizedTo,
} from '@angular/fire/auth-guard';

// BOTONES
import { BtnAgregarComponent } from './shared/btn-agregar/btn-agregar.component';
import { BtnEditarComponent } from './shared/btn-editar/btn-editar.component';
import { BtnEliminarComponent } from './shared/btn-eliminar/btn-eliminar.component';
import { ForgotPasswordComponent } from './appLogin/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from './appLogin/verify-email/verify-email.component';
import { SignUpComponent } from './appLogin/sign-up/sign-up.component';
import { LoginHeaderComponent } from './appLogin/login-header/login-header.component';
import { CajaControlComponent } from './caja/caja-control/caja-control.component';
import { CajaViewComponent } from './caja/caja-view/caja-view.component';

import { PerfilUsuarioComponent } from './perfil-usuario/perfil-usuario.component';
import { PerfilEmpresaComponent } from './perfil-empresa/perfil-empresa.component';
import { EmpresaFormComponent } from './perfil-empresa/empresa-form/empresa-form.component';
import { CajaCierreFormComponent } from './caja/forms/caja-cierre-form/caja-cierre-form.component';
import { CajaAperturaFormComponent } from './caja/forms/caja-apertura-form/caja-apertura-form.component';
import { CajaEgresoFormComponent } from './caja/forms/caja-egreso-form/caja-egreso-form.component';
import { CajaIngresoFormComponent } from './caja/forms/caja-ingreso-form/caja-ingreso-form.component';
import { DataTablesModule } from 'angular-datatables';
import { CajaLogComponent } from './caja/caja-log/caja-log.component';
import { NavbarComponent } from './home/navbar/navbar.component';
import { HeaderComponent } from './home/header/header.component';
import { AppRoutingModule } from './app-routing.module';
import { PagoAbonoComponent } from './clientes/pago-abono/pago-abono.component';



@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    OcupacionComponent,
    LoginComponent,
    HomeComponent,
    BtnAgregarComponent,
    BtnEditarComponent,
    BtnEliminarComponent,
    PlayaFormComponent,
    FilterPipe,

    PagenotfoundComponent,
    ClientesFormComponent,
    PlayaViewComponent,
    PlayaControlComponent,
    ClientesViewComponent,
    ClientesControlComponent,

    TicketEntradaComponent,
    BtnReimpresionComponent,

    TarifasControlComponent,
    TarifasViewComponent,
    TarifasFormComponent,

    FacturacionControlComponent,
    FacturacionViewComponent,
    FacturacionFormComponent,
    InicioComponent,
    VehiculosFormComponent,

    ConsultaFacturacionComponent,
    ScannerComponent,
    LogsComponent,

    SpinnerComponent,
    LogoutComponent,
    ForgotPasswordComponent,
    VerifyEmailComponent,
    SignUpComponent,
    LoginHeaderComponent,
    CajaControlComponent,
    CajaViewComponent,

    PerfilUsuarioComponent,
    PerfilEmpresaComponent,
    EmpresaFormComponent,
    CajaCierreFormComponent,
    CajaAperturaFormComponent,
    CajaEgresoFormComponent,
    CajaIngresoFormComponent,
    CajaLogComponent,
    NavbarComponent,
    PagoAbonoComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgxPrintElementModule,
    NgxBarcode6Module,
    AppRoutingModule,
    NgbModule, //se importa la clase RouterModule y se le indica la const donde estan las rutas
    ReactiveFormsModule,
    HttpClientModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    DataTablesModule,
  ],
  providers: [
    CustomAdapterService,
    CustomDateParserFormatterService,
    NgbTimeStringAdapterService,
    AuthService,
    { provide: FIREBASE_OPTIONS, useValue: environment.firebase },
    LogService,
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
