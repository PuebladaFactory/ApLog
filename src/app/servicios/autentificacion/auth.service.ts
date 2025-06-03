import { Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, User, reload } from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { DbFirestoreService } from '../database/db-firestore.service';
import { StorageService } from '../storage/storage.service';
import { LogService } from '../log/log.service';
import { environment } from '../../../environments/environment';
import { Auth } from '@angular/fire/auth';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  userData: any;
  usuario: any;

  private auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);

  constructor(
    public router: Router,
    public ngZone: NgZone,
    private storage: StorageService,
    private dbFirebase: DbFirestoreService,
    private logService: LogService
  ) { }

  async SignIn(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      const userData = await this.GetUserData(result.user!.uid);

      if (userData === null) {
        this.router.navigate(['/unauthorized']);
      } else {
        this.checkEmailVerification();
        this.usuario = userData;
        this.storage.setInfo('usuario', [userData]);

        if (!this.usuario.roles.god) {
          await this.logService.logEvent(
            'LOGIN',
            'users',
            `Usuario ${result.user!.email} inició sesión.`,
            0,
            true
          );
        }

        if (this.usuario.hasOwnProperty('roles')) {
          this.router.navigate(['/carga']);
        } else {
          this.router.navigate(['/unauthorized']);
        }
      }
    } catch (error: any) {
      console.error(error.message);
      this.logService.logEvent(
        'LOGIN',
        'users',
        `Error al iniciar sesión: ${error.message}`,
        0,
        false
      );
      window.alert(error.message);
    }
  }

  async GetUserData(uid: string): Promise<any> {
    const docRef = doc(this.firestore, `users/${uid}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.error('No user data found!');
      return null;
    }
  }

  checkEmailVerification(): void {
    const user = this.auth.currentUser;
    if (user) {
      reload(user).then(() => {
        if (user.emailVerified) {
          this.updateEmailVerifiedStatus(user.uid);
        }
      });
    }
  }

  private updateEmailVerifiedStatus(uid: string): void {
    const userRef = doc(this.firestore, `users/${uid}`);
    updateDoc(userRef, { emailVerified: true }).then(() => {
      console.log('Email verification status updated successfully in Firestore.');
    });
  }

  async SignUp(email: string, password: string): Promise<void> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      await this.SendVerificationMail();
      const initialRoles = { god: false, admin: false, manager: false, user: false };
      await this.SetUserData(result.user, initialRoles);
    } catch (error: any) {
      window.alert(error.message);
    }
  }

SendVerificationMail(): Promise<void> {
  return sendEmailVerification(this.auth.currentUser!)
    .then(() => {
      this.router.navigate(['verify-email-address']);
    })
    .then(() => {}); // fuerza Promise<void>
}

  ForgotPassword(passwordResetEmail: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, passwordResetEmail)
      .then(() => window.alert('Password reset email sent, check your inbox.'))
      .catch((error) => window.alert(error));
  }

  GoogleAuth(): Promise<void> {
    return this.AuthLogin(new GoogleAuthProvider());
  }

  AuthLogin(provider: GoogleAuthProvider): Promise<void> {
    return signInWithPopup(this.auth, provider)
      .then((result) => {
        this.SetUserData(result.user);
      })
      .catch((error) => {
        window.alert(error);
      });
  }

  async SignOut(): Promise<void> {
    try {
      const usuario = this.storage.loadInfo('usuario');
      if (usuario[0] && !usuario[0].roles.god) {
        await this.logService.logEvent(
          'LOGOUT',
          'users',
          `Usuario ${usuario[0].email} cerró sesión.`,
          0,
          true
        );
      }
      localStorage.clear();
      this.router.navigate(['/login']);
      console.log('Cierre de sesión exitoso.');
      await signOut(this.auth);
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      await this.logService.logEvent(
        'LOGOUT',
        'users',
        `Error al cerrar sesión: ${error.message}`,
        0,
        false
      );
    }
  }

  async SetUserData(user: User, roles: { god?: boolean; admin?: boolean; manager?: boolean; user?: boolean } = { admin: false, manager: false, user: false }) {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    const userData: any = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      emailVerified: user.emailVerified,
      roles: roles,
      name: (user as any).name || '',
    };
    return setDoc(userRef, userData, { merge: true });
  }

  currentUserRoles() {
    const user = JSON.parse(localStorage.getItem('usuario')!);
    return user ? user[0].roles : { god: false, admin: false, manager: false, user: false };
  }
}
