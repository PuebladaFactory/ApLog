import { Injectable, NgZone } from '@angular/core';
// import { User } from '../services/user';
import * as auth from 'firebase/auth';
import { AngularFireAuth, } from '@angular/fire/compat/auth';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { DbFirestoreService } from '../database/db-firestore.service';
import { StorageService } from '../storage/storage.service';
import { LogService } from '../log/log.service';
@Injectable({
  providedIn: 'root',
})
export class AuthService {

  userData: any; // Save logged in user data


  // PROPIEDAD PARA LA APP NO DEL LOGIN

  usuario: any;

  constructor(

    public afs: AngularFirestore, // Inject Firestore service
    public afAuth: AngularFireAuth, // Inject Firebase auth service
    public router: Router,
    public ngZone: NgZone, // NgZone service to remove outside scope warning

    // SERVICIOS DE LA APP
    private storage: StorageService,
    private dbFirebase: DbFirestoreService,
    private logService: LogService
  ) {

  }

 
      SignIn(email: string, password: string) {
        return this.afAuth
          .signInWithEmailAndPassword(email, password)
          .then((result) => {
            //console.log("result: ", result)
            // Obtener los datos del usuario desde Firestore
            this.GetUserData(result.user!.uid).then((userData) => {
              console.log('User data:', userData);
              if(userData === null) {
                this.router.navigate(['/unauthorized']);
              } else {
                this.checkEmailVerification();
                this.usuario = userData;              
                //this.storage.setInfo(`usuario`, this.usuario);
                this.storage.setInfo(`usuario`, [userData]);
                //this.dbFirebase.setearColeccion('Vantruck')

                //registra el ingreso
                this.logService.logEvent(
                  'LOGIN',
                  'users',
                  `Usuario ${result.user!.email} inició sesión.`,
                  0,
                  true
                );

                if(this.usuario.hasOwnProperty('roles')){
                  this.router.navigate(['/carga']);
                } else {
                  this.router.navigate(['/unauthorized']);
                }
              }              
            });
          })
          .catch((error) => {

            this.logService.logEvent(
              'LOGIN',
              'users',
              `Error al iniciar sesión: ${error.message}`,
              0,
              false
            );
    

            window.alert(error.message);
          });
      }
      
      GetUserData(uid: string): Promise<any> {
        return this.afs.doc(`users/${uid}`).ref.get().then((doc) => {
          if (doc.exists) {
            return doc.data(); // Retorna los datos del usuario
          } else {
            console.error('No user data found!');
            return null;
          }
        });
      }

       // Verificar correo electrónico y actualizar Firestore
      checkEmailVerification(): void {
        this.afAuth.currentUser.then((user) => {
          if (user) {
            // Recarga la información del usuario para actualizar su estado
            user.reload().then(() => {
              if (user.emailVerified) {
                this.updateEmailVerifiedStatus(user.uid);
              }
            });
          }
        });
      }

      // Actualiza el campo emailVerified en Firestore
      private updateEmailVerifiedStatus(uid: string): void {
        const userRef: AngularFirestoreDocument<any> = this.afs.doc(`users/${uid}`);
        userRef.update({ emailVerified: true }).then(() => {
          console.log('Email verification status updated successfully in Firestore.');
        });
      }
      

 
      SignUp(email: string, password: string) {
        return this.afAuth
          .createUserWithEmailAndPassword(email, password)
          .then((result) => {
            this.SendVerificationMail();
            const initialRoles = { god: false, admin: false, manager: false, user: false }; // Roles iniciales
            this.SetUserData(result.user, initialRoles);
          })
          .catch((error) => {
            window.alert(error.message);
          });
      }
      

  // Send email verfificaiton when new user sign up
  SendVerificationMail() {
    return this.afAuth.currentUser
      .then((u: any) => u.sendEmailVerification())
      .then(() => {
        this.router.navigate(['verify-email-address']);
      });
  }

  // Reset Forggot password
  ForgotPassword(passwordResetEmail: string) {
    return this.afAuth
      .sendPasswordResetEmail(passwordResetEmail)
      .then(() => {
        window.alert('Password reset email sent, check your inbox.');
      })
      .catch((error) => {
        window.alert(error);
      });
  }



  // Sign in with Google
  GoogleAuth() {
    return this.AuthLogin(new auth.GoogleAuthProvider()).then((res: any) => {
      
    });
  }

  // Auth logic to run auth providers
  AuthLogin(provider: any) {
    return this.afAuth
      .signInWithPopup(provider)
      .then((result) => {


        this.SetUserData(result.user);


      })
      .catch((error) => {
        window.alert(error);
      });
  }


  // PORQUE NO ANDA???  USAR LOGOUT MIENTRAS
  // // Sign out
  async SignOut(): Promise<void> {
   
    try {
      const usuario = this.storage.loadInfo('usuario'); // Cargar usuario del local storage
      
      // 1. Registrar en el log el cierre de sesión
      if (usuario[0]) {
        await this.logService.logEvent(
          'LOGOUT',
          'users',
          `Usuario ${usuario[0].email} cerró sesión.`,
          0,
          true
        );
      }

      
      //this.storage.signOut()
      // 3. Borrar el local storage
      //this.storage.clearAllLocalStorage();
      localStorage.clear();
      // 4. Redirigir al login
      this.router.navigate(['/login']);

      console.log('Cierre de sesión exitoso.');

      // 2. Cerrar sesión en Firebase
      await this.afAuth.signOut();
    } catch (error:any) {
      console.error('Error al cerrar sesión:', error);

      // Registrar el error en el log
      await this.logService.logEvent(
        'LOGOUT',
        'users',
        `Error al cerrar sesión: ${error.message}`,
        0,
        false
      );
    }
  }
  
  
  

    SetUserData(user: any, roles: { admin: boolean; manager: boolean; user: boolean } = { admin: false, manager: false, user: false }) {
      const userRef: AngularFirestoreDocument<any> = this.afs.doc(`users/${user.uid}`);
      const userData: any = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        emailVerified: user.emailVerified,
        roles: roles, // Solo se asigna al registrar el usuario,
        name: user.name || '',
      };
    
      return userRef.set(userData, {
        merge: true, // Evita sobrescribir datos existentes
      });
    }
    



  // METODOS DE LA APP NO DEL LOGIN


  currentUserRoles() {
    const user = JSON.parse(localStorage.getItem('usuario')!);
    return user ? user[0].roles : { god: false, admin: false, manager: false, user: false };
  }

}
