/** Forma compartida de los 3 environments (`environment.ts`/`.prod.ts`/`.vantruck.ts`).
 *  `functionsRegion` es opcional a propósito: pf-logistics/Vantruck todavía no
 *  realineó sus Cloud Functions a `southamerica-east1` del lado servidor (ver
 *  CLAUDE.md → "Deuda conocida"), así que `environment.vantruck.ts` la deja
 *  ausente — `getFunctions(undefined, environment.functionsRegion)` con
 *  `undefined` cae al comportamiento default de la SDK, sin cambios para ese
 *  entorno hasta que se pague esa deuda. */
export interface Environment {
  production: boolean;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  cloudinary: {
    cloudName: string;
    uploadPreset: string;
  };
  functionsRegion?: string;
}
