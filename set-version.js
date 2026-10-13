const { execSync } = require('child_process');
const fs = require('fs');
const packageJson = require('./package.json');

// Obtenemos versión SemVer desde package.json
const semver = packageJson.version;

// Obtenemos commit corto
const gitCommit = execSync('git rev-parse --short HEAD').toString().trim();

// Fecha de build en hora de Argentina (FE5b; antes, desde las 21:00 daba el
// día siguiente). El formato 'en-CA' es YYYY-MM-DD.
const buildDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

// Contenido del archivo version.ts
const fileContents = `
// Este archivo es generado automáticamente por set-version.js
export const appVersion = 'v${semver}';
export const buildMeta = '${gitCommit} - ${buildDate}';
`.trim() + '\n';

fs.writeFileSync('src/environments/version.ts', fileContents);
console.log(`✅ Versión generada: v${semver} (${gitCommit} - ${buildDate})`);
