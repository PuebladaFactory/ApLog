export type RolUsuario = 'dev' | 'admin' | 'manager' | 'user' | 'demo';

export interface Usuario {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  role: RolUsuario;
  name: string;
}
