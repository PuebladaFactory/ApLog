````
# Instrucción F8c — Finanzas: Recibo / Orden de pago en PDF

## Contexto

Frente Finanzas. Diseño: `claude/diseno-finanzas.md` §22.2 (F58, F59, F60).
F8b dejó los datos de la empresa en `configuracion/empresa`. Este bloque
imprime el comprobante de un movimiento desde su detalle.

- **Cobro → RECIBO; pago → ORDEN DE PAGO.** Las devoluciones (F7b) salen
  con el comprobante de su tipo y el concepto "devolución del saldo a
  favor de RC-…" o "devolución del anticipo OPG-…". Los ajustes no tienen
  comprobante: el botón no aparece.
- **Contenido** (A4 vertical, verificado renderizando dos ejemplos):
  - **Encabezado:** a la izquierda, el logo y los datos de la empresa
    (`lineasEncabezadoEmpresa`); a la derecha, el título, el número, la
    fecha y "Documento no válido como factura".
  - **Texto principal:** "Recibimos de / Pagamos a {entidad} (CUIT …) la
    suma de PESOS {en letras} ($ …)" (F58), más "En concepto de: …"
    (cancelación de comprobantes, anticipo, préstamo o devolución).
  - **Tabla de valores:** medio, detalle (banco, número, fecha de cobro del
    cheque, impuesto y certificado de la retención), importe y total.
  - **Tabla "Aplicado a":** comprobante, período, factura, aplicación,
    fecha e importe, con su total. "Saldo a cuenta" o "A cuenta" si queda
    algo sin imputar.
  - **Observaciones.**
  - **Firma (F60):** una línea abajo a la derecha. En el recibo: "Por
    {empresa}: firma y aclaración". En la orden de pago: "Recibí conforme:
    {entidad} — firma, aclaración y DNI".
  - **Anulado:** línea roja "ANULADO el … — Motivo: …" y marca de agua
    ANULADO.
  - **Pie:** "Generado el …" y "{TÍTULO} N° … — Página X de Y".
- **Sin datos de la empresa:** el PDF sale igual, solo con el logo, y un
  aviso dice dónde cargarlos (Ajustes → Datos de la empresa).
- **Log:** REIMPRIMIR en `movimientosFin` (acción sin mutación, como la
  liquidación).
- **Permiso del botón:** `finanzas.reimprimir` (= leer; demo también
  imprime).

**Piezas:**
- `shared/utils/numero-letras.util.ts` (nuevo, puro): `importeEnLetras`
  y `enteroEnLetras`, en es-AR con apócope ("veintiún mil", "un millón",
  "cien" / "ciento uno"), hasta 999.999.999.999,99, con "CON NN/100".
- `shared/utils/recibo-movimiento.util.ts` (nuevo, puro):
  `armarDocumentoRecibo(mov, empresa)` y `detalleMedioRecibo`.
- `servicios/finanzas-nueva/recibo-pdf.service.ts` (nuevo):
  `descargar(mov)` lee la empresa (con caché), arma el documento, lo
  dibuja (`generar`, jsPDF + autotable cargados al usarse, mismo estilo que
  los demás PDF), lo descarga con FileSaver y registra el log.
- **Detalle del movimiento:** botón "Imprimir recibo" / "Imprimir orden de
  pago".

Sin índices ni reglas: NO hay deploy.

Ya verificado:

- tsc estricto, con stubs y los tipos reales de jsPDF / autotable;
- `importeEnLetras` con 26 casos: 0, 1, 21, 31, 100, 101, 1.000, 1.021,
  21.000 ("VEINTIÚN MIL"), 31.500 ("TREINTA Y UN MIL QUINIENTOS"),
  101.000, 1.000.000 ("UN MILLÓN"), 21.000.000, 1.234.567,89, el máximo y
  0,50;
- dos PDF renderizados y revisados a ojo:
  - un recibo con 3 medios (transferencia, retención, e-cheq), 2
    comprobantes, saldo a cuenta y observaciones;
  - una orden de pago de anticipo ANULADA, sin datos de la empresa.
  En los dos, los acentos y la ñ salen bien.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto BUSCAR no aparece, o aparece más de una vez: pará y reportá,
  sin improvisar.
- Archivos con finales de línea LF.
- Build: `npm run build:demo`.
- No toques CLAUDE.md ni CHANGELOG.
- No se modifican tipos existentes.
- Todos los cambios a archivos existentes son BUSCAR/REEMPLAZAR. Los
  archivos nuevos dicen "NUEVO" en el título del paso.
- La instrucción termina con la línea `FIN DE LA INSTRUCCIÓN F8c`. Si no la
  ves, llegó cortada: leela completa (por partes si hace falta) antes de
  empezar.

## PASO 0 — Verificación (sin cambios)

Corré y reportá la salida:

```bash
grep -n "async registrarAccion" -A2 src/app/servicios/log-registro/log-registro.service.ts
grep -n "export const LOGO_EMPRESA_BASE64\|export function fechaHoraActual\|export function formatearMoneda" src/app/servicios/exportacion/logo-empresa.ts src/app/servicios/exportacion/formato-exportacion.ts
grep -n "async obtener(" src/app/servicios/configuracion/configuracion-empresa.service.ts
grep -n "'reimprimir'" src/app/interfaces/permiso.ts
grep -rn "numero-letras\|recibo-movimiento\|ReciboPdfService" src/app
grep -n "Imprimir (recibo / orden de pago) llega en F8" src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.ts
```

Esperado:

- El grep 1: la firma con `'REIMPRIMIR'`.
- El grep 2: 3 líneas.
- El grep 3: 1 línea (F8b).
- El grep 4: 1 línea.
- El grep 5: nada.
- El grep 6: 1 línea.

Si algo no coincide, pará y reportá.

## PASO 1 — NUEVO `src/app/shared/utils/numero-letras.util.ts`

```ts
/** Importe en letras (es-AR) para recibos y órdenes de pago (F8c). Puro.
 *  importeEnLetras(1234567.89) → "UN MILLÓN DOSCIENTOS TREINTA Y CUATRO MIL
 *  QUINIENTOS SESENTA Y SIETE CON 89/100". Hasta 999.999.999.999. */

const UNIDADES = [
  '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
  'veintiocho', 'veintinueve',
];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos',
  'ochocientos', 'novecientos',
];

/** 0..999 en letras ('' para 0). `apocopar`: "uno" → "un" (antes de mil /
 *  millón: "veintiún mil", "un millón"). */
function hasta999(n: number, apocopar: boolean): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let resto: string;
  if (r < 30) {
    resto = UNIDADES[r];
    if (apocopar) {
      if (r === 1) resto = 'un';
      else if (r === 21) resto = 'veintiún';
    }
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    const unidad = u === 1 && apocopar ? 'un' : UNIDADES[u];
    resto = u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${unidad}`;
  }
  return [CENTENAS[c], resto].filter(Boolean).join(' ');
}

/** 0..999.999 en letras. */
function hastaMillon(n: number, apocopar: boolean): string {
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  const parteMiles = miles === 0 ? '' : miles === 1 ? 'mil' : `${hasta999(miles, true)} mil`;
  return [parteMiles, hasta999(resto, apocopar)].filter(Boolean).join(' ');
}

/** Entero ≥ 0 en letras ("cero" para 0). */
export function enteroEnLetras(n: number): string {
  const entero = Math.floor(Math.abs(n));
  if (entero === 0) return 'cero';
  const millones = Math.floor(entero / 1_000_000);
  const resto = entero % 1_000_000;
  const parteMillones = millones === 0 ? '' : millones === 1 ? 'un millón' : `${hastaMillon(millones, true)} millones`;
  return [parteMillones, hastaMillon(resto, false)].filter(Boolean).join(' ');
}

/** Importe en letras, en mayúsculas, con centavos "CON NN/100". */
export function importeEnLetras(importe: number): string {
  const centavosTotales = Math.round(Math.abs(importe) * 100);
  const entero = Math.floor(centavosTotales / 100);
  const centavos = centavosTotales % 100;
  return `${enteroEnLetras(entero)} con ${String(centavos).padStart(2, '0')}/100`.toUpperCase();
}
```

## PASO 2 — NUEVO `src/app/shared/utils/recibo-movimiento.util.ts`

```ts
import { DatosEmpresa } from 'src/app/interfaces/configuracion-empresa';
import { MedioMovimientoFin, MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { formatearCuit, lineasEncabezadoEmpresa } from 'src/app/shared/utils/datos-empresa.util';
import { fechaComprobanteLegible } from 'src/app/shared/utils/factura-electronica.util';
import { redondear2 } from 'src/app/shared/utils/finanzas.util';
import {
  ETIQUETA_IMPUESTO, ETIQUETA_MEDIO, ETIQUETA_ORIGEN_IMPUTACION, esDevolucion, movimientoOrigenDe,
} from 'src/app/shared/utils/movimiento-fin.util';
import { importeEnLetras } from 'src/app/shared/utils/numero-letras.util';

/** Recibo (cobro) / Orden de pago (pago) de un movimiento de Finanzas (F8c)
 *  — util PURO: arma el contenido; lo dibuja ReciboPdfService. Textos solo
 *  WinAnsi. No es un comprobante fiscal. Diseño: claude/diseno-finanzas.md
 *  §22.2 (F58 letras, F59 datos de la empresa, F60 firma). */

export interface FilaMedioRecibo {
  medio: string;
  detalle: string;
  importe: number;
}

export interface FilaImputacionRecibo {
  documento: string;
  periodo: string;
  factura: string;
  aplicacion: string;
  fecha: string;          // legible
  importe: number;
}

export interface DocumentoRecibo {
  nombreArchivo: string;
  titulo: 'RECIBO' | 'ORDEN DE PAGO';
  numero: string;
  fecha: string;          // legible
  empresa: string[];      // líneas del encabezado ([] si no hay datos)
  /** "Recibimos de X (CUIT …) la suma de PESOS … ($ …)". */
  textoPrincipal: string;
  concepto: string;
  medios: FilaMedioRecibo[];
  total: number;
  imputaciones: FilaImputacionRecibo[];
  totalImputado: number;
  sinImputar: number;
  etiquetaSinImputar: string;
  observaciones: string;
  /** Leyenda debajo de la línea de firma. */
  firma: string;
  /** null si está vigente. */
  anulacion: { fecha: string; motivo: string } | null;
}

function pesos(v: number): string {
  return `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Banco, número, fecha de cobro del cheque o datos de la retención. */
export function detalleMedioRecibo(md: MedioMovimientoFin): string {
  if (md.tipo === 'retencion' && md.retencion) {
    return [
      ETIQUETA_IMPUESTO[md.retencion.impuesto] ?? md.retencion.impuesto,
      md.retencion.jurisdiccion,
      `Certificado ${md.retencion.certificado}`,
    ].filter(Boolean).join(' · ');
  }
  return [
    md.banco,
    md.referencia ? `N° ${md.referencia}` : null,
    md.fechaCobro ? `Cobro ${fechaComprobanteLegible(md.fechaCobro)}` : null,
  ].filter(Boolean).join(' · ') || '—';
}

function periodoLegible(periodoClave: string | null): string {
  if (!periodoClave) return '—';
  const m = /^(\d{4})-(\d{2})/.exec(periodoClave);
  return m ? `${m[2]}/${m[1]}` : periodoClave;
}

function sanear(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._ -]+/g, '').trim().replace(/\s+/g, '_');
}

/** Lo que dice el renglón "en concepto de". */
function conceptoDe(m: MovimientoFin): string {
  if (esDevolucion(m)) {
    const origen = movimientoOrigenDe(m) ?? '';
    return m.tipo === 'pago' ? `devolución del saldo a favor de ${origen}` : `devolución del anticipo ${origen}`;
  }
  if (m.concepto === 'anticipo') return 'anticipo a cuenta de futuras liquidaciones';
  if (m.concepto === 'prestamo') return 'préstamo';
  return m.sinImputar > 0 ? 'cancelación de los comprobantes detallados y saldo a cuenta' : 'cancelación de los comprobantes detallados';
}

/** Tira Error con un ajuste (no tiene recibo). */
export function armarDocumentoRecibo(m: MovimientoFin, empresa: DatosEmpresa | null): DocumentoRecibo {
  if (m.tipo === 'ajuste') throw new Error('Un ajuste no tiene recibo ni orden de pago.');
  const cobro = m.tipo === 'cobro';
  const titulo = cobro ? 'RECIBO' : 'ORDEN DE PAGO';
  const entidad = `${m.entidad.razonSocial}${m.entidad.cuit ? ` (CUIT ${formatearCuit(m.entidad.cuit)})` : ''}`;
  const verbo = cobro ? 'Recibimos de' : 'Pagamos a';
  const total = redondear2(m.total);
  return {
    nombreArchivo: sanear(`${titulo === 'RECIBO' ? 'Recibo' : 'Orden de pago'} ${m.numero} ${m.entidad.razonSocial}`),
    titulo,
    numero: m.numero,
    fecha: fechaComprobanteLegible(m.fecha),
    empresa: empresa ? lineasEncabezadoEmpresa(empresa) : [],
    textoPrincipal: `${verbo} ${entidad} la suma de PESOS ${importeEnLetras(total)} (${pesos(total)}).`,
    concepto: conceptoDe(m),
    medios: (m.medios ?? []).map(md => ({
      medio: ETIQUETA_MEDIO[md.tipo] ?? md.tipo,
      detalle: detalleMedioRecibo(md),
      importe: redondear2(md.importe),
    })),
    total,
    imputaciones: (m.imputaciones ?? []).map(i => ({
      documento: i.numeroDocumento,
      periodo: periodoLegible(i.periodoClave),
      factura: i.fechaFactura ? fechaComprobanteLegible(i.fechaFactura) : '—',
      aplicacion: ETIQUETA_ORIGEN_IMPUTACION[i.origen] ?? i.origen,
      fecha: fechaComprobanteLegible(i.fecha),
      importe: redondear2(i.importe),
    })),
    totalImputado: redondear2(m.totalImputado),
    sinImputar: redondear2(m.sinImputar),
    etiquetaSinImputar: cobro ? 'Saldo a cuenta (a favor del cliente)' : 'A cuenta (anticipo / saldo pendiente)',
    observaciones: (m.observaciones ?? '').trim(),
    firma: cobro
      ? `Por ${empresa?.razonSocial || 'la empresa'}: firma y aclaración`
      : `Recibí conforme: ${m.entidad.razonSocial} — firma, aclaración y DNI`,
    anulacion: m.estado === 'anulado' && m.anulacion
      ? {
        // anulacion.fecha es un instante (ISO con hora): se muestra en hora local.
        fecha: new Date(m.anulacion.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        motivo: m.anulacion.motivo,
      }
      : null,
  };
}
```

## PASO 3 — NUEVO `src/app/servicios/finanzas-nueva/recibo-pdf.service.ts`

```ts
import { Injectable, inject } from '@angular/core';
import * as FileSaver from 'file-saver';
import { MovimientoFin } from 'src/app/interfaces/movimiento-fin';
import { Resultado } from 'src/app/interfaces/resultado';
import { ConfiguracionEmpresaService } from 'src/app/servicios/configuracion/configuracion-empresa.service';
import { fechaHoraActual, formatearMoneda } from 'src/app/servicios/exportacion/formato-exportacion';
import { LOGO_EMPRESA_BASE64 } from 'src/app/servicios/exportacion/logo-empresa';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { DocumentoRecibo, armarDocumentoRecibo } from 'src/app/shared/utils/recibo-movimiento.util';

const MARGEN = 14;                                   // mm
const COLOR_ENCABEZADO: [number, number, number] = [100, 149, 237];
const COLOR_ZEBRA: [number, number, number] = [236, 242, 251];

/** Recibo / Orden de pago en PDF (F8c): QUÉ dice lo arma
 *  armarDocumentoRecibo (puro); acá se dibuja (jsPDF + autotable, cargados
 *  al usarse), se descarga y se registra un log REIMPRIMIR. A4 vertical:
 *  logo + datos de la empresa | título, número y fecha; texto principal con
 *  el importe en letras; medios; comprobantes aplicados; observaciones;
 *  línea de firma. Anulado: marca de agua ANULADO + motivo. */
@Injectable({ providedIn: 'root' })
export class ReciboPdfService {

  private configEmpresa = inject(ConfiguracionEmpresaService);
  private logRegistro = inject(LogRegistroService);

  /** Genera y descarga. `sinDatosEmpresa`: se imprimió sin el encabezado de
   *  la empresa (todavía no se cargaron en Ajustes). */
  async descargar(m: MovimientoFin & { idMovimiento: string }): Promise<Resultado<{ sinDatosEmpresa: boolean }>> {
    try {
      const empresa = await this.configEmpresa.obtener();
      const doc = armarDocumentoRecibo(m, empresa);
      const blob = await this.generar(doc);
      FileSaver.saveAs(blob, `${doc.nombreArchivo}.pdf`);
      await this.logRegistro.registrarAccion(
        'REIMPRIMIR', 'movimientosFin', m.idMovimiento,
        `PDF ${doc.titulo === 'RECIBO' ? 'del recibo' : 'de la orden de pago'} ${doc.numero}`,
      );
      return { exito: true, mensaje: `${doc.titulo === 'RECIBO' ? 'Recibo' : 'Orden de pago'} ${doc.numero} generado.`, objeto: { sinDatosEmpresa: !empresa } };
    } catch (e: any) {
      return { exito: false, mensaje: `No se pudo generar el PDF: ${e?.message ?? e}` };
    }
  }

  async generar(doc: DocumentoRecibo): Promise<Blob> {
    const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const autoTable = autoTableMod.default;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setProperties({ title: doc.nombreArchivo });
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const anchoUtil = ancho - 2 * MARGEN;
    const xDer = ancho - MARGEN;

    // ---- Encabezado: logo + empresa (izq.) | título, número, fecha (der.) ----
    pdf.addImage(LOGO_EMPRESA_BASE64, 'PNG', MARGEN, 12, 40, 12.3);
    let yEmp = 30;
    pdf.setTextColor(0, 0, 0);
    doc.empresa.forEach((l, i) => {
      pdf.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      pdf.setFontSize(i === 0 ? 9.5 : 8);
      pdf.text(l, MARGEN, yEmp);
      yEmp += 4;
    });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(doc.titulo, xDer, 18, { align: 'right' });
    pdf.setFontSize(12);
    pdf.text(`N° ${doc.numero}`, xDer, 25, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Fecha: ${doc.fecha}`, xDer, 31, { align: 'right' });
    pdf.setFontSize(7.5);
    pdf.setTextColor(110, 110, 110);
    pdf.text('Documento no válido como factura', xDer, 36, { align: 'right' });
    pdf.setTextColor(0, 0, 0);

    let y = Math.max(yEmp, 40) + 2;
    pdf.setDrawColor(180, 180, 180);
    pdf.line(MARGEN, y, xDer, y);
    y += 7;

    // ---- Anulado ----
    if (doc.anulacion) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(200, 30, 30);
      const lineas: string[] = pdf.splitTextToSize(`ANULADO el ${doc.anulacion.fecha} — Motivo: ${doc.anulacion.motivo}`, anchoUtil);
      pdf.text(lineas, MARGEN, y);
      y += lineas.length * 5 + 2;
      pdf.setTextColor(0, 0, 0);
    }

    // ---- Texto principal + concepto ----
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    const principal: string[] = pdf.splitTextToSize(doc.textoPrincipal, anchoUtil);
    pdf.text(principal, MARGEN, y);
    y += principal.length * 5.2;
    const concepto: string[] = pdf.splitTextToSize(`En concepto de: ${doc.concepto}.`, anchoUtil);
    pdf.text(concepto, MARGEN, y);
    y += concepto.length * 5.2 + 3;

    const estilos = {
      theme: 'grid' as const,
      styles: { fontSize: 8.5, cellPadding: 1.6, textColor: 20, lineColor: [180, 180, 180] as [number, number, number], lineWidth: 0.2 },
      headStyles: { fillColor: COLOR_ENCABEZADO, textColor: 0, fontStyle: 'bold' as const, halign: 'center' as const },
      footStyles: { fillColor: COLOR_ENCABEZADO, textColor: 0, fontStyle: 'bold' as const },
      alternateRowStyles: { fillColor: COLOR_ZEBRA },
      margin: { left: MARGEN, right: MARGEN, bottom: 20 },
    };

    // ---- Medios ----
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(doc.titulo === 'RECIBO' ? 'Valores recibidos' : 'Valores entregados', MARGEN, y);
    autoTable(pdf, {
      ...estilos,
      startY: y + 2,
      head: [['Medio', 'Detalle', 'Importe']],
      body: doc.medios.map(md => [md.medio, md.detalle, formatearMoneda(md.importe)]),
      foot: [['Total', '', formatearMoneda(doc.total)]],
      columnStyles: { 0: { cellWidth: 32 }, 2: { halign: 'right', cellWidth: 34 } },
    });
    y = (pdf as any).lastAutoTable.finalY + 7;

    // ---- Comprobantes aplicados ----
    if (doc.imputaciones.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Aplicado a', MARGEN, y);
      autoTable(pdf, {
        ...estilos,
        startY: y + 2,
        head: [['Comprobante', 'Período', 'Factura', 'Aplicación', 'Fecha', 'Importe']],
        body: doc.imputaciones.map(i => [i.documento, i.periodo, i.factura, i.aplicacion, i.fecha, formatearMoneda(i.importe)]),
        foot: [['Total aplicado', '', '', '', '', formatearMoneda(doc.totalImputado)]],
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right', cellWidth: 34 } },
      });
      y = (pdf as any).lastAutoTable.finalY + 5;
    }
    if (doc.sinImputar > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.text(`${doc.etiquetaSinImputar}: ${formatearMoneda(doc.sinImputar)}`, xDer, y, { align: 'right' });
      y += 6;
    }

    // ---- Observaciones ----
    if (doc.observaciones) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const obs: string[] = pdf.splitTextToSize(`Observaciones: ${doc.observaciones}`, anchoUtil);
      if (y + obs.length * 4.5 > alto - 50) { pdf.addPage(); y = 20; }
      pdf.text(obs, MARGEN, y);
      y += obs.length * 4.5 + 3;
    }

    // ---- Firma (F60) ----
    let yFirma = Math.max(y + 25, alto - 45);
    if (yFirma > alto - 25) { pdf.addPage(); yFirma = 60; }
    const anchoFirma = 80;
    const xFirma = xDer - anchoFirma;
    pdf.setDrawColor(60, 60, 60);
    pdf.line(xFirma, yFirma, xDer, yFirma);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const firma: string[] = pdf.splitTextToSize(doc.firma, anchoFirma);
    pdf.text(firma, xFirma + anchoFirma / 2, yFirma + 4.5, { align: 'center' });

    // ---- Todas las páginas: marca ANULADO + pie ----
    const generado = `Generado el ${fechaHoraActual()}`;
    const paginas = pdf.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      pdf.setPage(p);
      if (doc.anulacion) this.dibujarMarca(pdf, 'ANULADO', ancho, alto);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(generado, MARGEN, alto - 8);
      pdf.text(`${doc.titulo} N° ${doc.numero} — Página ${p} de ${paginas}`, xDer, alto - 8, { align: 'right' });
      pdf.setTextColor(0, 0, 0);
    }

    return pdf.output('blob');
  }

  /** Texto diagonal translúcido (mismo criterio que PdfTabularService). */
  private dibujarMarca(pdf: any, marca: string, ancho: number, alto: number): void {
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 0.12 }));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(80);
    pdf.setTextColor(200, 30, 30);
    const w = pdf.getTextWidth(marca);
    const ang = (30 * Math.PI) / 180;
    pdf.text(marca, ancho / 2 - (w / 2) * Math.cos(ang), alto / 2 + (w / 2) * Math.sin(ang), { angle: 30 });
    pdf.restoreGraphicsState();
  }
}
```

## PASO 4 — `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.ts`

#### 4a

BUSCAR:
```ts
import { Component, Input } from '@angular/core';
```

REEMPLAZAR:
```ts
import { Component, Input, inject } from '@angular/core';
```

#### 4b

BUSCAR:
```ts
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
```

REEMPLAZAR:
```ts
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ReciboPdfService } from 'src/app/servicios/finanzas-nueva/recibo-pdf.service';
```

#### 4c

BUSCAR:
```ts
 *  el flujo. Imprimir (recibo / orden de pago) llega en F8. */
```

REEMPLAZAR:
```ts
 *  el flujo. Imprimir (F8c): Recibo (cobro) / Orden de pago (pago) en PDF
 *  con ReciboPdfService; los ajustes no tienen comprobante. */
```

#### 4d

BUSCAR:
```ts
  /** Si ya estamos en la cuenta de esta entidad, no hay a dónde ir (F5d). */
```

REEMPLAZAR:
```ts
  imprimiendo = false;
  private reciboPdf = inject(ReciboPdfService);

  /** "Imprimir recibo" / "Imprimir orden de pago"; null en un ajuste. */
  get textoImprimir(): string | null {
    if (this.movimiento.tipo === 'ajuste') return null;
    return this.movimiento.tipo === 'cobro' ? 'Imprimir recibo' : 'Imprimir orden de pago';
  }

  /** Descarga el PDF (F8c). Si faltan los datos de la empresa, avisa dónde
   *  cargarlos (el PDF sale igual, solo con el logo). */
  async imprimir(): Promise<void> {
    if (this.imprimiendo) return;
    this.imprimiendo = true;
    try {
      const res = await this.reciboPdf.descargar(this.movimiento);
      if (!res.exito) {
        Swal.fire({ icon: 'error', text: res.mensaje });
      } else if (res.objeto?.sinDatosEmpresa) {
        Swal.fire({
          icon: 'info',
          text: 'El PDF salió sin los datos de la empresa: cargalos en Ajustes → Datos de la empresa.',
        });
      }
    } finally {
      this.imprimiendo = false;
    }
  }

  /** Si ya estamos en la cuenta de esta entidad, no hay a dónde ir (F5d). */
```

## PASO 5 — `src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.html`

#### 5a

BUSCAR:
```html
  <button type="button" class="btn btn-outline-secondary" (click)="cerrar()">Cerrar</button>
```

REEMPLAZAR:
```html
  @if (textoImprimir) {
    <button *appPermiso="'finanzas.reimprimir'" type="button" class="btn btn-outline-primary"
      [disabled]="imprimiendo" (click)="imprimir()">{{ textoImprimir }}</button>
  }
  <button type="button" class="btn btn-outline-secondary" (click)="cerrar()">Cerrar</button>
```

## PASO 6 — Verificación

```bash
npm run build:demo
grep -c "^export function" src/app/shared/utils/numero-letras.util.ts src/app/shared/utils/recibo-movimiento.util.ts   # 2 y 2
grep -n "ReciboPdfService" src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.ts   # 2 líneas
grep -n "imprimir()" src/app/raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.html   # 1 línea
git status --short
```

Esperado:

- El build termina sin errores. Los warnings de presupuesto previos no
  cuentan.
- Los conteos coinciden.
- `git status` muestra:
  - 2 archivos modificados: detalle (ts y html);
  - 3 nuevos: los 2 utils y el servicio;
  - lo tuyo sin trackear, si lo hay.

Reportá la salida.

## Pruebas manuales (demo)

1. **Recibo:**
   - en Movimientos, abrí el detalle de un cobro con varios medios y
     comprobantes → "Imprimir recibo" descarga `Recibo_RC-…_….pdf`;
   - encabezado con el logo y los datos de la empresa (F8b) a la
     izquierda, y RECIBO, número y fecha a la derecha;
   - el monto en letras coincide con el total;
   - medios con su detalle (banco, número, retención con certificado);
   - "Aplicado a" con los comprobantes y "Saldo a cuenta" si el cobro dejó
     saldo a favor;
   - línea de firma "Por {empresa}: firma y aclaración".
2. **Orden de pago:** un pago a un chofer → "Imprimir orden de pago". La
   firma dice "Recibí conforme: {chofer} — firma, aclaración y DNI".
3. **Anticipo:** concepto "anticipo a cuenta de futuras liquidaciones" y
   "A cuenta (anticipo / saldo pendiente)". Si ya se compensó, "Aplicado a"
   muestra la compensación.
4. **Devolución (F7b):** la OPG al cliente o el RC del chofer dicen
   "devolución del saldo a favor de RC-…" / "devolución del anticipo
   OPG-…".
5. **Anulado:** línea roja con fecha y motivo, y la marca de agua ANULADO.
6. **Ajuste:** el detalle de un AJ no tiene botón de imprimir.
7. **Log:** el Registro Log muestra REIMPRIMIR con "PDF del recibo RC-…".
8. **demo:** también puede imprimir.

(El caso "sin datos de la empresa" no se puede provocar en demo sin borrar
el documento; quedó verificado en la prueba del PDF.)

## Commit (lo hace Nico)

```
feat(finanzas): Recibo / Orden de pago en PDF (F8c)

- ReciboPdfService: PDF A4 con logo y datos de la empresa
  (configuracion/empresa), número y fecha, texto con el importe en
  letras, medios, comprobantes aplicados, saldo a cuenta, observaciones,
  línea de firma (recibo: la empresa; OP: quien recibe) y marca ANULADO;
  descarga + log REIMPRIMIR.
- numero-letras.util (importeEnLetras es-AR) y recibo-movimiento.util
  (armarDocumentoRecibo; devoluciones con su concepto).
- Detalle del movimiento: "Imprimir recibo" / "Imprimir orden de pago"
  (no en ajustes).
```

FIN DE LA INSTRUCCIÓN F8c
````
