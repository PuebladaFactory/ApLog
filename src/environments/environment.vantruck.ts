// ENVIRONMENT PARA VANTRUCK
// functionsRegion queda sin definir a propósito: pf-logistics todavía no fue
// realineado a southamerica-east1 del lado servidor (deuda registrada en
// CLAUDE.md → "Deuda conocida"). Agregar `functionsRegion: 'southamerica-east1'`
// acá recién cuando esa realineación se despliegue contra pf-logistics.
import { Environment } from './environment.model';

export const environment: Environment = {
    production: true,
    firebase: {
        apiKey: "AIzaSyB4jR5D6ORBu70EM7vN8fnZhIeszvz3QTs",

        authDomain: "pf-logistics.firebaseapp.com",
      
        projectId: "pf-logistics",
      
        storageBucket: "pf-logistics.firebasestorage.app",
      
        messagingSenderId: "409434721530",
      
        appId: "1:409434721530:web:eccaae0a56068596a5cd43",
      
        measurementId: "G-QKQXYG18DZ"
      
    },
    cloudinary: {
      cloudName: 'dfrstiqwd',
      uploadPreset: 'ml_default'
    }
  };