import { CondicionIvaEmpresa, DatosEmpresa } from 'src/app/interfaces/configuracion-empresa';

/** Datos de la empresa (F8b) — utils PUROS: valores vacíos, normalización,
 *  validación y las líneas que se imprimen en los comprobantes. */

export const COLECCION_CONFIGURACION = 'configuracion';
export const ID_DATOS_EMPRESA = 'empresa';

export const ETIQUETA_CONDICION_IVA: Readonly<Record<CondicionIvaEmpresa, string>> = {
  responsable_inscripto: 'IVA Responsable Inscripto',
  monotributo: 'Responsable Monotributo',
  exento: 'IVA Exento',
};

export function datosEmpresaVacios(): DatosEmpresa {
  return {
    razonSocial: '', nombreFantasia: '', cuit: null, condicionIva: 'responsable_inscripto',
    ingresosBrutos: '', inicioActividades: null, domicilio: '', localidad: '', telefono: '', email: '',
    actualizado: null, usuario: null,
  };
}

/** CUIT válido: 11 dígitos con dígito verificador (módulo 11). */
export function cuitValido(cuit: number | null): boolean {
  if (cuit === null) return false;
  const s = String(cuit);
  if (!/^\d{11}$/.test(s)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(s[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return verificador === Number(s[10]);
}

/** "30-71111111-8". */
export function formatearCuit(cuit: number | null): string {
  if (cuit === null) return '';
  const s = String(cuit);
  return s.length === 11 ? `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}` : s;
}

/** Textos recortados; CUIT sin guiones ni espacios (number o null). */
export function normalizarDatosEmpresa(d: DatosEmpresa): DatosEmpresa {
  const t = (v: string | null | undefined) => (v ?? '').trim();
  const digitos = String(d.cuit ?? '').replace(/\D/g, '');
  return {
    ...d,
    razonSocial: t(d.razonSocial),
    nombreFantasia: t(d.nombreFantasia),
    cuit: digitos ? Number(digitos) : null,
    ingresosBrutos: t(d.ingresosBrutos),
    inicioActividades: d.inicioActividades ? d.inicioActividades : null,
    domicilio: t(d.domicilio),
    localidad: t(d.localidad),
    telefono: t(d.telefono),
    email: t(d.email),
  };
}

/** Sobre datos YA normalizados. Mensaje de error o null. */
export function validarDatosEmpresa(d: DatosEmpresa): string | null {
  if (!d.razonSocial) return 'La razón social es obligatoria.';
  if (!cuitValido(d.cuit)) return 'El CUIT no es válido (11 dígitos con su dígito verificador).';
  if (!d.domicilio) return 'El domicilio es obligatorio.';
  if (d.inicioActividades !== null && !/^\d{4}-\d{2}-\d{2}$/.test(d.inicioActividades)) return 'Fecha de inicio de actividades inválida.';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'El email no es válido.';
  return null;
}

/** Líneas del encabezado de un comprobante (Recibo / OP): razón social,
 *  CUIT + IVA (+ IIBB), domicilio, contacto. Solo las que tienen datos. */
export function lineasEncabezadoEmpresa(d: DatosEmpresa): string[] {
  const lineas: string[] = [];
  lineas.push(d.nombreFantasia ? `${d.razonSocial} (${d.nombreFantasia})` : d.razonSocial);
  const fiscal = [
    d.cuit !== null ? `CUIT ${formatearCuit(d.cuit)}` : '',
    ETIQUETA_CONDICION_IVA[d.condicionIva],
    d.ingresosBrutos ? `IIBB ${d.ingresosBrutos}` : '',
  ].filter(Boolean).join(' · ');
  if (fiscal) lineas.push(fiscal);
  const domicilio = [d.domicilio, d.localidad].filter(Boolean).join(', ');
  if (domicilio) lineas.push(domicilio);
  const contacto = [d.telefono ? `Tel. ${d.telefono}` : '', d.email].filter(Boolean).join(' · ');
  if (contacto) lineas.push(contacto);
  return lineas.filter(Boolean);
}
