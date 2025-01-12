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
  ) {

  }

  // Sign in with email/password
/*   SignIn(email: string, password: string) {
    return this.afAuth
      .signInWithEmailAndPassword(email, password)
      .then((result) => {
        this.SetUserData(result.user);        
      })
      .catch((error) => {
        window.alert(error.message);
      });
  } */

      SignIn(email: string, password: string) {
        return this.afAuth
          .signInWithEmailAndPassword(email, password)
          .then((result) => {
            // Obtener los datos del usuario desde Firestore
            this.GetUserData(result.user!.uid).then((userData) => {
              console.log('User data:', userData);
              if(userData === null) {
                this.router.navigate(['/unauthorized']);
              } else {
                this.checkEmailVerification();
                this.usuario = userData;              
                this.storage.setInfo(`usuario`, this.usuario);
                //this.dbFirebase.setearColeccion('Vantruck')
                if(this.usuario.hasOwnProperty('roles')){
                  this.router.navigate(['/carga']);
                } else {
                  this.router.navigate(['/unauthorized']);
                }
              }
              //this.setearColeccion();
              //this.filtrarRoles()
              // Aquí puedes manejar los datos del usuario (por ejemplo, guardar en un servicio)
            });
          })
          .catch((error) => {
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
      

  // Sign up with email/password
/*   SignUp(email: string, password: string) {
    return this.afAuth
      .createUserWithEmailAndPassword(email, password)
      .then((result) => {
        //Call the SendVerificaitonMail() function when new user sign up and returns promise 
        this.SendVerificationMail();
        this.SetUserData(result.user);
      })
      .catch((error) => {
        window.alert(error.message);
      });
  } */

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
  SignOut() {
    //console.log("saliendo signout")
    return this.afAuth.signOut().then(() => {
      this.storage.clearInfo('usuario');
      this.storage.clearAllLocalStorage()
      // this.router.navigate(['']);
      //Reload Angular to refresh components and prevent old data from loading up for a 
      //another user after login. This especially applies lazy loading cases. 
      location.reload();
    });
  }

  /* Setting up user data when sign in with username/password, 
  sign up with username/password and sign in with social auth  
  provider in Firestore database using AngularFirestore + AngularFirestoreDocument service */
/*   SetUserData(user: any) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    const userData: any = {   //aca va la interface usuario
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
    this.getUsuario(user.uid)
    return userRef.set(userData, {
      merge: true,
    });
  } */

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

  getUsuario(id: string) {
    this.dbFirebase.getUsuarioUid(id).subscribe((data) => {
      this.usuario = data;
      console.log("auth.service. el usuario logueado: ", data);      
      this.storage.setInfo(`usuario`, this.usuario);
      this.setearColeccion();
      this.filtrarRoles()
    });
  }

  //por alguno motivo no funciona
  setearColeccion() {
    this.dbFirebase.setearColeccion(this.usuario.coleccion);
    //this.storage.initializer()
    //this.router.navigate(['/home']);
    /* if(this.usuario.roles.user){
      this.router.navigate(['/chofer']);
    } else {
      this.router.navigate(['/home']);
    } */
    
  }


  // de acuerdo al rol, navega a la ruta correspondiente
  // esto habria que hacerlo con guards, pero los guards trabajan sacando la info del token
  filtrarRoles(){
    this.router.navigate(['/carga']);
     /* if(this.usuario.roles.god || this.usuario.roles.admin || this.usuario.roles.manager || this.usuario.roles.user){
      this.router.navigate(['/carga']);
    } else {
      alert("aca va el limbo")
    } */
  }

  currentUserRoles() {
    const user = JSON.parse(localStorage.getItem('usuario')!);
    return user ? user.roles : { god: false, admin: false, manager: false, user: false };
  }



}
