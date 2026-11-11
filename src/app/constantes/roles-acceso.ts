import { RolUsuario } from 'src/app/interfaces/usuario';

/** Roles que admiten las cinco pantallas de Ajustes (canActivate de cada hija
 *  en ajustes-routing): usuarios, registro, registro-log, papelera y empresa.
 *
 *  Es la única copia de esa lista. La usan las rutas y los componentes de otros
 *  módulos que ofrecen un enlace a una pantalla de Ajustes (hoy
 *  InformeOpAnuladosComponent.puedeVerPapelera), para no duplicarla.
 *
 *  Este archivo no importa ningún componente a propósito: se importa desde
 *  Liquidación sin arrastrar el chunk lazy de Ajustes.
 *
 *  Si una hija de Ajustes tiene que diferir del resto, deja de usar esta
 *  constante y declara su lista propia (y quien enlace a ella, también). */
export const ROLES_AJUSTES: readonly RolUsuario[] = ['dev', 'admin'];
