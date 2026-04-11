import { Injectable } from "@angular/core";
import * as ExcelJS from "exceljs";
import * as FileSaver from "file-saver";
import {
  Categoria,
  Chofer,
  Dirección,
  Vehiculo,
} from "src/app/interfaces/chofer";
import { Cliente, Contacto } from "src/app/interfaces/cliente";

import { Operacion } from "src/app/interfaces/operacion";
import { Proveedor } from "src/app/interfaces/proveedor";
import { StorageService } from "../../storage/storage.service";
import { ConId, ConIdType } from "src/app/interfaces/conId";

import saveAs from "file-saver";
import { InformeOp } from "src/app/interfaces/informe-op";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { OpVenta, ResumenVenta } from "src/app/interfaces/resumen-venta";
import { Workbook } from "exceljs";

type ChoferAsignado = ConIdType<Chofer> & {
  categoriaAsignada: Categoria;
  observaciones: string;
  hojaDeRuta: string;
  tEventual: boolean;
};

interface MetadataChofer {
  id: string;
  observaciones: string;
  hojaDeRuta: string;
  celda: string;
}

@Injectable({
  providedIn: "root",
})
export class ExcelService {
  factura!: InformeLiq;
  private readonly CATEGORIAS_TEXTO_CLARO = [
    "bg-dark",
    "bg-secondary",
    "bg-danger",
    "bg-primary",
  ];

  constructor(private storageService: StorageService) {}

  async exportToExcelInforme(
    informeLiq: InformeLiq,
    informesOp: InformeOp[],
    clientes: Cliente[],
    choferes: Chofer[],
    modo: string,
  ) {
    const titulo =
      modo === "factura"
        ? `Liquidación de Servicios ${informeLiq.entidad.razonSocial}`
        : `Proforma ${informeLiq.entidad.razonSocial}`;
    const subTitulo =
      modo === "factura"
        ? `${informeLiq.numeroInterno}`
        : `${informeLiq.idInfLiq}`;
    const nombreDoc =
      modo === "factura"
        ? `Detalle_${informeLiq.entidad.razonSocial}_${informeLiq.fecha}.xlsx`
        : `Proforma_${informeLiq.entidad.razonSocial}_${informeLiq.fecha}.xlsx`;

    await this.exportarExcelInfomeOpLiquidadas(
      informeLiq,
      informesOp,
      clientes,
      choferes,
      titulo,
      subTitulo,
      nombreDoc,
    );
  }

  async exportarExcelInfomeOpLiquidadas(
    informeLiq: InformeLiq,
    informesOp: InformeOp[],
    clientes: Cliente[],
    choferes: Chofer[],
    titulo: string,
    subtitulo: string,
    nombreDoc: string,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Datos");
    const periodo = informeLiq.periodo;

    // Logo
    const logoBase64 =
      "data:image/png;base64,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"; // Logo en formato base64
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: "png",
    });
    worksheet.addImage(imageId, "A1:B3");

    // Título
    worksheet.mergeCells("A5:F5");
    const titleCell = worksheet.getCell("A5");
    titleCell.value = titulo;
    titleCell.font = { size: 16, bold: true };

    // Subtítulo
    worksheet.mergeCells("A6:F6");
    const subTitleCell = worksheet.getCell("A6");
    subTitleCell.value = `Año: ${new Date(informeLiq.fecha).getFullYear()} Mes: ${informeLiq.mes} - Periodo Liquidado: ${periodo}`;
    subTitleCell.font = { size: 12, bold: true };

    // Subtítulo adicional
    worksheet.mergeCells("A7:F7");
    const subTitleCell2 = worksheet.getCell("A7");
    subTitleCell2.value = subtitulo;
    subTitleCell2.font = { size: 8 };

    // Encabezados
    worksheet.addRow(informeLiq.columnas).eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.alignment = { horizontal: "center", vertical: "top" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E90FF" },
      };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Filas dinámicas
    informesOp.forEach((informeOp) => {
      const row = worksheet.addRow(
        informeLiq.columnas.map((columna) => {
          if (
            ["Jornada", "Ad Km", "Ad Acomp", "Extra", "A Cobrar"].includes(
              columna,
            )
          ) {
            return this.obtenerDatos(
              informeLiq,
              informeOp,
              clientes,
              columna,
              choferes,
            ); // true = retorno numérico
          }
          return this.obtenerDatos(
            informeLiq,
            informeOp,
            clientes,
            columna,
            choferes,
          );
        }),
      );

      // Aplicar estilo + formato contable para columnas numéricas
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const columnaNombre = informeLiq.columnas[colNumber - 1]; // -1 porque colNumber es 1-based
        cell.font = { size: 12 };
        cell.alignment = { horizontal: "center", vertical: "top" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFADD8E6" },
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };

        if (
          ["Jornada", "Ad Km", "Ad Acomp", "Extra", "A Cobrar"].includes(
            columnaNombre,
          )
        ) {
          cell.numFmt = '"$"#,##0.00'; // formato contable en Excel
        }
      });
    });

    // Subtotal (si hay descuentos)
    if (informeLiq.descuentos.length > 0) {
      // Subtotal fila
      const subtotalRow = worksheet.addRow([]);
      worksheet.mergeCells(
        `A${subtotalRow.number}:${String.fromCharCode(64 + informeLiq.columnas.length - 1)}${subtotalRow.number}`,
      );
      subtotalRow.getCell(1).value = "Sub Total";
      subtotalRow.getCell(1).alignment = {
        horizontal: "left",
        vertical: "middle",
      };
      //
      const subtotalValor =
        informeLiq.valores.totalTarifaBase +
        informeLiq.valores.totalAcompaniante +
        informeLiq.valores.totalkmMonto +
        (informeLiq.valores.totalAdExtra ?? 0);
      subtotalRow.getCell(informeLiq.columnas.length).value = subtotalValor;
      subtotalRow.getCell(informeLiq.columnas.length).numFmt = '"$"#,##0.00';
      subtotalRow.getCell(informeLiq.columnas.length).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      //

      subtotalRow.eachCell((cell) => {
        cell.font = { size: 12, bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E90FF" },
        }; // Azul
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Fila de descuentos
      informeLiq.descuentos.forEach((descuento) => {
        const descuentoRow = worksheet.addRow([]);
        worksheet.mergeCells(
          `A${descuentoRow.number}:${String.fromCharCode(64 + informeLiq.columnas.length - 1)}${descuentoRow.number}`,
        );
        descuentoRow.getCell(1).value = descuento.concepto;
        descuentoRow.getCell(1).alignment = {
          horizontal: "left",
          vertical: "middle",
        };
        //
        descuentoRow.getCell(informeLiq.columnas.length).value =
          descuento.valor;
        descuentoRow.getCell(informeLiq.columnas.length).numFmt = '"$"#,##0.00';
        //

        descuentoRow.getCell(informeLiq.columnas.length).alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        descuentoRow.eachCell((cell) => {
          cell.font = { size: 12, bold: false }; // Mantener consistencia con el footer
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1E90FF" },
          }; // Azul como el footer
          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });
    }

    // Total final
    const totalRow = worksheet.addRow([]);
    worksheet.mergeCells(
      `A${totalRow.number}:${String.fromCharCode(64 + informeLiq.columnas.length - 1)}${totalRow.number}`,
    );
    totalRow.getCell(1).value = "Total";
    totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    //
    totalRow.getCell(informeLiq.columnas.length).value =
      informeLiq.valores.total;
    totalRow.getCell(informeLiq.columnas.length).numFmt = '"$"#,##0.00';
    //

    totalRow.getCell(informeLiq.columnas.length).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    totalRow.eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E90FF" },
      }; // Azul como el resto del footer
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Configurar el tamaño del informe para una hoja A4
    worksheet.pageSetup.paperSize = 9; // Tamaño A4
    //worksheet.pageSetup.orientation = 'landscape'; // Orientación horizontal (opcional, ajusta según necesidad)
    worksheet.pageSetup.fitToPage = true; // Ajustar al tamaño de la página
    worksheet.pageSetup.fitToWidth = 1; // Ajustar al ancho de la página
    worksheet.pageSetup.fitToHeight = 0; // Permitir que la altura sea dinámica

    // Ajustar texto dentro de las celdas para que no se exceda
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { wrapText: true, vertical: "middle" }; // Ajustar texto y centrar
      });
    });

    // Configuración del ancho de las columnas basadas en el contenido esperado
    worksheet.columns = informeLiq.columnas.map((columna) => {
      switch (columna) {
        case "Fecha":
          return { key: columna, width: 12 }; // yyyy-mm-dd tiene un ancho ideal de 12
        case "Quincena":
          return { key: columna, width: 11 }; // "Primera" o "Segunda" requiere un ancho de 10
        case "Km":
          return { key: columna, width: 5 }; // 3 dígitos + espacio adicional
        case "Patente":
          return { key: columna, width: 10 }; // "Primera" o "Segunda" requiere un ancho de 10
        case "Hoja de Ruta":
          return { key: columna, width: 14 }; // "Primera" o "Segunda" requiere un ancho de 10
        default:
          return { key: columna, width: 25 }; // Ancho estándar para otras columnas
      }
    });

    // Ajustar alineación del texto y permitir saltos de línea en todas las celdas
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { wrapText: true, vertical: "middle" }; // Ajustar texto y centrar
      });
    });

    // Guardar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), nombreDoc);
  }

  getQuincena(fecha: any): string {
    //console.log("fecha: ", fecha);

    // Dividir el string de la fecha en año, mes y día
    const [year, month, day] = fecha.split("-").map(Number);

    // Crear la fecha asegurando que tome la zona horaria local
    const date = new Date(year, month - 1, day); // mes - 1 porque los meses en JavaScript son 0-indexed

    // Determinar si está en la primera o segunda quincena
    return day <= 15 ? "Primera" : "Segunda";
  }

  getChofer(idChofer: number, choferes: Chofer[]) {
    let chofer: Chofer[];
    chofer = choferes.filter((c: Chofer) => {
      return c.idChofer === idChofer;
    });
    return chofer[0].apellido + " " + chofer[0].nombre;
  }

  getCliente(idCliente: number, clientes: Cliente[]) {
    let cliente: Cliente[];
    cliente = clientes.filter((c: Cliente) => {
      return c.idCliente === idCliente;
    });
    return cliente[0].razonSocial;
  }

  getProveedor(idProveedor: number) {
    let proveedores: Proveedor[] = this.storageService.loadInfo("proveedores");
    let proveedorOp: Proveedor[];

    proveedorOp = proveedores.filter((p: Proveedor) => {
      return p.idProveedor === idProveedor;
    });
    return proveedorOp[0].razonSocial;
  }

  getCategoria(patente: string, idChofer: number) {
    let veh: Vehiculo[];
    let choferSel: Chofer[];
    let choferesStorage: Chofer[] = this.storageService.loadInfo("choferes");
    choferSel = choferesStorage.filter((c: Chofer) => {
      return c.idChofer === idChofer;
    });
    veh = choferSel[0].vehiculo.filter((v: Vehiculo) => {
      return v.dominio === patente;
    });
    console.log(veh[0]);

    return veh[0].categoria.nombre;
  }

  obtenerDatos(
    factura: InformeLiq,
    informeOp: InformeOp,
    clientes: Cliente[],
    columna: any,
    choferes: Chofer[],
  ) {
    switch (columna) {
      case "Fecha": {
        return informeOp.fecha;
      }
      case "Quincena": {
        return this.getQuincena(informeOp.fecha);
      }
      case "Chofer": {
        return this.getChofer(informeOp.idChofer, choferes);
      }
      case "Cliente": {
        return this.getCliente(informeOp.idCliente, clientes);
      }
      case "Patente": {
        return informeOp.patente;
      }
      case "Concepto": {
        return this.getCategoria(informeOp.patente, informeOp.idChofer);
      }
      case "Observaciones": {
        return informeOp.observaciones;
      }
      case "Hoja de Ruta": {
        return informeOp.hojaRuta;
      }
      case "Km": {
        return informeOp.km;
      }
      case "Jornada": {
        return informeOp.valores.tarifaBase;
      }
      case "Ad Km": {
        return informeOp.valores.kmMonto;
      }
      case "Ad Acomp": {
        return informeOp.valores.acompaniante;
      }
      case "Extra": {
        return informeOp.valores.adExtra ?? 0;
      }
      case "A Cobrar": {
        return informeOp.valores.total;
      }
      default: {
        return "";
      }
    }
  }

  ////////////// informe EXCEL del tablero de Operaciones
  async generarInformeOperaciones(
    fechaDesde: string,
    fechaHasta: string,
    operaciones: any[],
  ) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Operaciones");

    // -----------------------------
    // ENCABEZADO SUPERIOR
    // -----------------------------

    worksheet.addRow(["Informe de Operaciones"]);
    worksheet.mergeCells("A1:T1");
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.addRow(["Desde:", fechaDesde]);
    worksheet.addRow(["Hasta:", fechaHasta]);
    worksheet.addRow([]);

    // -----------------------------
    // BUILD DATA ROWS
    // -----------------------------

    const rows = operaciones.map((op) => {
      const estado = op.estado?.abierta
        ? "Abierta"
        : op.estado?.cerrada
          ? "Cerrada"
          : op.estado?.facturada
            ? "Facturada"
            : op.estado?.facCliente
              ? "Cliente Fac"
              : op.estado?.facChofer
                ? "Chofer Fac"
                : "Sin Datos";

      const proveedor =
        op.chofer?.idProveedor === 0
          ? "No"
          : this.getProveedor(op.chofer?.idProveedor);

      const categoria = this.getCategoria(
        op.patenteChofer,
        op.chofer?.idChofer,
      );

      return [
        estado,
        op.fecha,
        op.idOperacion,
        op.km,

        op.cliente?.razonSocial,
        op.valores?.cliente?.tarifaBase,
        op.valores?.cliente?.kmAdicional,
        op.valores?.cliente?.acompValor,
        op.valores?.cliente?.aCobrar,

        op.chofer?.apellido + " " + op.chofer?.nombre,
        proveedor,
        op.patenteChofer,
        categoria,
        op.valores?.chofer?.tarifaBase,
        op.valores?.chofer?.kmAdicional,
        op.valores?.chofer?.acompValor,
        op.valores?.chofer?.aPagar,

        op.acompaniante ? "Sí" : "No",
        op.hojaRuta,
        op.observaciones,
      ];
    });

    // -----------------------------
    // TABLA EXCEL REAL
    // -----------------------------

    worksheet.addTable({
      name: "OperacionesTabla",
      ref: "A5",
      headerRow: true,
      totalsRow: false,

      style: {
        theme: "TableStyleMedium9",
        showRowStripes: true,
      },

      columns: [
        { name: "Estado" },
        { name: "Fecha" },
        { name: "Operacion" },
        { name: "Km" },

        { name: "Cliente" },
        { name: "Tarifa Base Cl" },
        { name: "Adic Km Cl" },
        { name: "Acomp Cl" },
        { name: "Total Cl" },

        { name: "Chofer" },
        { name: "Proveedor" },
        { name: "Patente" },
        { name: "Categoria" },
        { name: "Tarifa Base Ch" },
        { name: "Adic Km Ch" },
        { name: "Acomp Ch" },
        { name: "Total Ch" },

        { name: "Acompañante" },
        { name: "Hoja Ruta" },
        { name: "Observaciones" },
      ],

      rows,
    });

    // -----------------------------
    // FORMATOS
    // -----------------------------

    worksheet.getColumn("B").numFmt = "dd/mm/yyyy";
    worksheet.getColumn("C").numFmt = "0";

    const currencyFormat = '"$"#,##0.00';

    ["F", "G", "H", "I", "N", "O", "P", "Q"].forEach((c) => {
      worksheet.getColumn(c).numFmt = currencyFormat;
    });

    // -----------------------------
    // AUTO WIDTH
    // -----------------------------

    worksheet.columns.forEach((col) => {
      if (!col) return;

      let maxLength = 10;

      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > maxLength) maxLength = len;
      });

      col.width = Math.min(maxLength + 2, 40);
    });

    // -----------------------------
    // SAVE
    // -----------------------------

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `operaciones_${fechaDesde}_${fechaHasta}.xlsx`;
    a.click();

    window.URL.revokeObjectURL(url);
  }

  /** Crea y descarga el tablero en Excel */
  async generarInformeAsignaciones(
    asignaciones: { [idCliente: number]: ChoferAsignado[] },
    todosClientes: ConIdType<Cliente>[],
    choferesAgrupadosPorCategoria: {
      nombre: string;
      catOrden: number;
      choferes: ConId<Chofer>[];
    }[],
    choferesInactivos: ConIdType<Chofer>[],
    fechaSeleccionada: string,
    sectionColorClasses: string[],
  ): Promise<void> {
    // Crear un nuevo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Asignaciones");
    const metadata: any[] = [];
    const existingMetaSheet = workbook.getWorksheet("_metadata");
    if (existingMetaSheet) {
      workbook.removeWorksheet(existingMetaSheet.id);
    }
    // 1. Configuración inicial
    worksheet.properties.defaultColWidth = 15;

    // 2. Fila 1: Operaciones del día
    const fechaRow = worksheet.getRow(1);
    fechaRow.getCell(1).value = "Operaciones del dia:";
    fechaRow.getCell(2).value = fechaSeleccionada;
    fechaRow.getCell(1).font = { bold: true };

    // Combinar celdas para el título de fecha
    //worksheet.mergeCells('A1:B1');

    // 3. Fila 2: Títulos
    const titulosRow = worksheet.getRow(2);
    titulosRow.getCell(1).value = "Clientes Asignados";

    // Obtener clientes CON asignaciones (array no vacío)
    const clientesConAsignaciones = todosClientes.filter((cliente) => {
      const asignacionesCliente = asignaciones[cliente.idCliente];
      return asignacionesCliente && asignacionesCliente.length > 0;
    });

    // 4. Tabla de clientes asignados (desde fila 3)
    // Encabezados solo para clientes con asignaciones
    clientesConAsignaciones.forEach((cliente, index) => {
      const headerCell = worksheet.getCell(3, index + 1);
      headerCell.value = cliente.razonSocial;
      headerCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" }, // Gris claro
      };
      headerCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      headerCell.font = { bold: true };
    });

    // Asignaciones para cada cliente (hasta 15 filas)
    for (let i = 0; i < 15; i++) {
      const dataRow = worksheet.getRow(4 + i);

      clientesConAsignaciones.forEach((cliente, colIndex) => {
        const asignacionesCliente = asignaciones[cliente.idCliente] || [];
        const choferAsignado = asignacionesCliente[i];
        const cell = dataRow.getCell(colIndex + 1);

        if (choferAsignado) {
          const categoriaIndex = choferesAgrupadosPorCategoria.findIndex(
            (cat) => cat.catOrden === choferAsignado.categoriaAsignada.catOrden,
          );

          this.setCellWithMetadata(
            cell,
            choferAsignado,
            workbook,
            categoriaIndex,
            sectionColorClasses,
          );
        }

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // 5. Clientes SIN asignaciones (a la derecha, con columna en blanco)
    const clientesSinAsignaciones = todosClientes.filter((cliente) => {
      const asignacionesCliente = asignaciones[cliente.idCliente];
      return !asignacionesCliente || asignacionesCliente.length === 0;
    });
    // 5. Clientes SIN asignaciones (organizados en columnas según espacio)
    const columnaInicioSinAsignaciones = clientesConAsignaciones.length + 2;
    const filaInicioSinAsignaciones = 3;
    const maxFilasTablaAsignaciones = 15; // Altura de la tabla de asignaciones

    // Título (combinado para todas las columnas de sin asignaciones)
    worksheet.getCell(2, columnaInicioSinAsignaciones).value =
      "Clientes sin Asignaciones";
    worksheet.getCell(2, columnaInicioSinAsignaciones).font = { bold: true };
    worksheet.mergeCells(
      2,
      columnaInicioSinAsignaciones,
      2,
      columnaInicioSinAsignaciones +
        Math.ceil(clientesSinAsignaciones.length / maxFilasTablaAsignaciones) -
        1,
    );

    // Dividir clientes sin asignaciones en grupos para cada columna
    const gruposSinAsignaciones = this.chunkArray(
      clientesSinAsignaciones,
      maxFilasTablaAsignaciones,
    );

    gruposSinAsignaciones.forEach((grupo, grupoIndex) => {
      const columnaActual = columnaInicioSinAsignaciones + grupoIndex;

      grupo.forEach((cliente, index) => {
        const filaActual = filaInicioSinAsignaciones + index;
        const cell = worksheet.getCell(filaActual, columnaActual);

        cell.value = cliente.razonSocial;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD3D3D3" }, // Gris claro
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Aplicar bordes a celdas vacías si el grupo no llega al máximo
      if (grupo.length < maxFilasTablaAsignaciones) {
        for (let i = grupo.length; i < maxFilasTablaAsignaciones; i++) {
          const cell = worksheet.getCell(
            filaInicioSinAsignaciones + i,
            columnaActual,
          );
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFFFF" }, // Blanco
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        }
      }
    });

    // 6. Choferes por categoría (dejando una fila en blanco)
    const filaInicioCategorias = 20; // Después de las 15 filas de asignaciones + espacio

    choferesAgrupadosPorCategoria
      .sort((a, b) => a.catOrden - b.catOrden)
      .forEach((categoria, catIndex) => {
        // Obtener color de fondo y determinar color de texto
        const bgColor = this.mapColorClassToExcelColor(
          sectionColorClasses[catIndex],
        );
        const textColor = this.shouldUseWhiteText(sectionColorClasses[catIndex])
          ? "FFFFFFFF"
          : "FF000000";

        // Encabezado de categoría (solo color de texto, fondo blanco)
        const headerCell = worksheet.getCell(
          filaInicioCategorias,
          catIndex + 1,
        );
        headerCell.value = categoria.nombre;
        headerCell.font = {
          bold: true,
          color: {
            argb: this.mapColorClassToExcelColor(sectionColorClasses[catIndex]),
          },
        };
        headerCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFFFF" }, // Fondo blanco
        };

        // Choferes de esta categoría (fondo color categoría + texto blanco/negro según corresponda)
        categoria.choferes.forEach((chofer, choferIndex) => {
          const cell = worksheet.getCell(
            filaInicioCategorias + 1 + choferIndex,
            catIndex + 1,
          );

          // Usamos el helper para choferes asignados (con metadata)
          if ("observaciones" in chofer && "hojaDeRuta" in chofer) {
            this.setCellWithMetadata(
              cell,
              chofer as ChoferAsignado,
              workbook,
              catIndex, // Usamos el índice de la categoría actual
              sectionColorClasses,
            );
          } else {
            cell.value = chofer.apellido + " " + chofer.nombre;
            // Mantener estilos existentes para choferes no asignados
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: bgColor },
            };
            cell.font = {
              color: { argb: textColor },
            };
          }

          // Mantén el código existente de colores
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bgColor },
          };
          cell.font = {
            color: { argb: textColor },
          };
        });
      });

    // 7. Choferes inactivos (banco de suplentes)
    const columnaInicioInactivos = choferesAgrupadosPorCategoria.length + 2;

    // Título
    worksheet.getCell(filaInicioCategorias, columnaInicioInactivos).value =
      "Banco de suplentes";
    worksheet.getCell(filaInicioCategorias, columnaInicioInactivos).font = {
      bold: true,
      color: { argb: "FFFFC107" },
    };

    // Listado de choferes inactivos
    choferesInactivos.forEach((chofer, index) => {
      worksheet.getCell(
        filaInicioCategorias + 1 + index,
        columnaInicioInactivos,
      ).value = chofer.apellido + " " + chofer.nombre;
    });

    // Ajustar anchos de columnas
    worksheet.columns.forEach((column) => {
      if (!column.values) return;

      const maxLength = column.values.reduce(
        (acc: number, cellValue: ExcelJS.CellValue) => {
          if (cellValue === null || cellValue === undefined) return acc;

          let strValue: string;

          try {
            // Intenta convertir cualquier tipo de valor a string
            strValue = cellValue.toString();
          } catch (e) {
            // Si falla, usa un valor por defecto
            strValue = "";
          }

          return Math.max(acc, strValue.length);
        },
        0,
      );

      column.width = Math.min(Math.max(maxLength + 2, 10), 30);
    });
    this.agregarHojaMetadata(workbook, metadata);
    // Generar el archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Asignaciones_${fechaSeleccionada.replace(/\//g, "-")}.xlsx`);
  }

  // Método auxiliar para mapear clases de color a colores de Excel
  private mapColorClassToExcelColor(colorClass: string): string {
    const colorMap: Record<string, string> = {
      "bg-primary": "FF007BFF", // Azul
      "bg-success": "FF28A745", // Verde
      "bg-warning": "FFFFC107", // Amarillo
      "bg-info": "FF17A2B8", // Cyan
      "bg-danger": "FFDC3545", // Rojo
      "bg-secondary": "FF6C757D", // Gris
      "bg-dark": "FF343A40", // Negro
    };

    const foundKey = Object.keys(colorMap).find((key) =>
      colorClass.includes(key),
    );
    return foundKey ? colorMap[foundKey] : "FFFFFFFF"; // Blanco por defecto
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  private shouldUseWhiteText(colorClass: string): boolean {
    const categoriasTextoBlanco = [
      "bg-dark",
      "bg-secondary",
      "bg-danger",
      "bg-primary",
    ];
    return categoriasTextoBlanco.some((cat) => colorClass.includes(cat));
  }

  private setCellWithMetadata(
    cell: ExcelJS.Cell,
    chofer: ChoferAsignado,
    workbook: ExcelJS.Workbook,
    categoriaIndex: number, // Nuevo parámetro
    sectionColorClasses: string[], // Nuevo parámetro
  ) {
    // 1. Valor principal visible
    cell.value = `${chofer.apellido}, ${chofer.nombre}`;

    // 2. Comentario con metadata
    cell.note = `📝 Observaciones: ${chofer.observaciones}\n🗺 Hoja de Ruta: ${chofer.hojaDeRuta}`;

    // 3. Guardar metadata en hoja oculta
    this.agregarMetadata(workbook, {
      id: chofer.id.toString(),
      observaciones: chofer.observaciones,
      hojaDeRuta: chofer.hojaDeRuta,
      celda: cell.address,
    });

    // 4. Aplicar estilos de categoría (manteniendo los colores originales)
    if (categoriaIndex >= 0 && categoriaIndex < sectionColorClasses.length) {
      const bgColor = this.mapColorClassToExcelColor(
        sectionColorClasses[categoriaIndex],
      );
      const textColor = this.shouldUseWhiteText(
        sectionColorClasses[categoriaIndex],
      )
        ? "FFFFFFFF"
        : "FF000000";

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.font = {
        color: { argb: textColor },
        italic: true, // Estilo adicional para celdas con metadata
      };
    }

    // 5. Bordes consistentes
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  }

  private agregarMetadata(
    workbook: ExcelJS.Workbook,
    data: {
      id: string;
      observaciones: string;
      hojaDeRuta: string;
      celda: string;
    },
  ) {
    let sheet = workbook.getWorksheet("_metadata");

    if (!sheet) {
      sheet = workbook.addWorksheet("_metadata", { state: "veryHidden" });
      sheet.addRow(["ID", "Observaciones", "Hoja de Ruta", "Celda"]);
    }

    sheet.addRow([data.id, data.observaciones, data.hojaDeRuta, data.celda]);
  }

  // Actualizar el método leerMetadataExcel:
  async leerMetadataExcel(file: File): Promise<Partial<ChoferAsignado>[]> {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const choferes: Partial<ChoferAsignado>[] = [];
    const metaSheet = workbook.getWorksheet("_metadata");

    if (!metaSheet) return choferes;

    metaSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezados

      choferes.push({
        idChofer: Number(row.getCell(1).value),
        observaciones: row.getCell(2).value?.toString(),
        hojaDeRuta: row.getCell(3).value?.toString(),
        // Nota: Esto devuelve Partial<ChoferAsignado>
      });
    });

    return choferes;
  }

  private agregarHojaMetadata(
    workbook: ExcelJS.Workbook,
    datos: MetadataChofer[],
  ) {
    // Eliminar hoja existente si hay
    const existingSheet = workbook.getWorksheet("_metadata");
    if (existingSheet) {
      workbook.removeWorksheet(existingSheet.id);
    }

    const sheet = workbook.addWorksheet("_metadata", {
      state: "hidden",
      properties: { tabColor: { argb: "FFFF0000" } }, // Rojo para identificar fácil
    });

    // Encabezados
    const headerRow = sheet.addRow([
      "ID",
      "Observaciones",
      "Hoja de Ruta",
      "Celda",
    ]);
    headerRow.font = { bold: true };

    // Datos
    datos.forEach((chofer) => {
      sheet.addRow([
        chofer.id,
        chofer.observaciones,
        chofer.hojaDeRuta,
        chofer.celda,
      ]);
    });

    // Ocultar completamente
    sheet.state = "veryHidden"; // Más oculto que 'hidden'
  }

  ///listado de clientes

  async exportarClientesTablaExcel(
    clientes: any[],
    modo: string,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${modo}`);

    // Congelar encabezados
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // ----------------------------
    // Columnas de la tabla
    // ----------------------------
    const columnas = [
      { name: "Razón Social", filterButton: true },
      { name: "CUIT", filterButton: true },
      { name: "Dirección Fiscal", filterButton: true },
      { name: "Localidad Fiscal", filterButton: true },
      { name: "Municipio Fiscal", filterButton: true },
      { name: "Provincia Fiscal", filterButton: true },
      { name: "Dirección Operativa", filterButton: true },
      { name: "Localidad Operativa", filterButton: true },
      { name: "Municipio Operativa", filterButton: true },
      { name: "Provincia Operativa", filterButton: true },
      { name: "Condición Fiscal", filterButton: true },
      { name: "Contactos", filterButton: true },
    ];

    // ----------------------------
    // Filas base (sin contactos aún)
    // ----------------------------
    const filas = clientes.map((cliente) => [
      cliente.razonSocial,
      cliente.cuit.toString(), // CUIT como texto
      cliente.direccionFiscal?.domicilio ?? "",
      cliente.direccionFiscal?.localidad ?? "",
      cliente.direccionFiscal?.municipio ?? "",
      cliente.direccionFiscal?.provincia ?? "",
      cliente.direccionOperativa?.domicilio ?? "",
      cliente.direccionOperativa?.localidad ?? "",
      cliente.direccionOperativa?.municipio ?? "",
      cliente.direccionOperativa?.provincia ?? "",
      cliente.condFiscal,
      "", // contactos luego
    ]);

    // ----------------------------
    // Crear TABLA REAL de Excel
    // ----------------------------
    worksheet.addTable({
      name: "TablaClientes",
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium2",
        showRowStripes: true,
      },
      columns: columnas,
      rows: filas,
    });

    // ----------------------------
    // Estilos post-creación
    // ----------------------------
    clientes.forEach((cliente, index) => {
      const rowNumber = index + 2; // fila real en hoja (1 es header)

      // Razón social en negrita
      worksheet.getCell(rowNumber, 1).font = { bold: true };

      // Contactos con richText
      worksheet.getCell(rowNumber, 12).value = this.formatearContactosRich(
        cliente.contactos,
      );
    });

    // ----------------------------
    // Ajustes generales
    // ----------------------------
    worksheet.columns.forEach((col) => {
      col.width = 30;
    });

    // Bordes (refuerzo visual)
    const borderAll = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    } as const;

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = borderAll;
        cell.alignment = {
          vertical: "top",
          wrapText: true,
        };
      });
    });

    // ----------------------------
    // Exportar archivo
    // ----------------------------
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(
      new Blob([buffer]),

      `${modo}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  private formatearDireccion(dir: Dirección): string {
    return `${dir.domicilio}, ${dir.localidad}, ${dir.municipio}, ${dir.provincia}`;
  }

  private formatearContactosRich(contactos: Contacto[]) {
    if (!contactos || contactos.length === 0) {
      return { richText: [{ text: "—" }] };
    }

    const richText: any[] = [];

    contactos.forEach((c, index) => {
      if (index > 0) {
        richText.push({ text: "\n" });
      }

      richText.push({
        text: `${c.puesto}: `,
        font: { bold: true },
      });

      richText.push({
        text: `${c.apellido} ${c.nombre} · ${c.telefono} · ${c.email}`,
      });
    });

    return { richText };
  }

  async exportarChoferesTablaExcel(choferes: ConId<Chofer>[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Choferes");

    // Congelar encabezados
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    // ----------------------------
    // Columnas de la tabla
    // ----------------------------
    const columnas = [
      { name: "Apellido", filterButton: true },
      { name: "Nombre", filterButton: true },
      { name: "CUIT", filterButton: true },
      { name: "Celular", filterButton: true },
      { name: "Celular Emergencia", filterButton: true },
      { name: "Contacto Emergencia", filterButton: true },
      // 👇 NUEVAS COLUMNAS
      { name: "Dirección", filterButton: true },
      { name: "Localidad", filterButton: true },
      { name: "Municipio", filterButton: true },
      { name: "Provincia", filterButton: true },
      { name: "Email", filterButton: true },
      { name: "Fecha de Nacimiento", filterButton: true },
      { name: "Condición Fiscal", filterButton: true },
      { name: "Vehículos", filterButton: true },
    ];

    // ----------------------------
    // Filas base (vehículos después)
    // ----------------------------
    const filas = choferes.map((ch) => [
      ch.apellido,
      ch.nombre,
      ch.cuit.toString(),
      ch.celularContacto,
      ch.celularEmergencia,
      ch.contactoEmergencia,
      // 👇 Dirección desagregada
      ch.direccion?.domicilio ?? "",
      ch.direccion?.localidad ?? "",
      ch.direccion?.municipio ?? "",
      ch.direccion?.provincia ?? "",
      ch.email,
      this.formatearFecha(ch.fechaNac),
      ch.condFiscal,
      "", // vehículos luego
    ]);

    // ----------------------------
    // Crear TABLA REAL de Excel
    // ----------------------------
    worksheet.addTable({
      name: "TablaChoferes",
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium2",
        showRowStripes: true,
      },
      columns: columnas,
      rows: filas,
    });

    // ----------------------------
    // Estilos post-creación
    // ----------------------------
    choferes.forEach((chofer, index) => {
      const rowNumber = index + 2;

      // Apellido en negrita
      worksheet.getCell(rowNumber, 1).font = { bold: true };

      // Vehículos (dominio en negrita)
      worksheet.getCell(rowNumber, 14).value = this.formatearVehiculosRich(
        chofer.vehiculo,
      );
    });

    // ----------------------------
    // Ajustes generales
    // ----------------------------
    worksheet.columns.forEach((col) => (col.width = 28));

    const borderAll = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    } as const;

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = borderAll;
        cell.alignment = {
          vertical: "top",
          wrapText: true,
        };
      });
    });

    // ----------------------------
    // Exportar archivo
    // ----------------------------
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(
      new Blob([buffer]),
      `Choferes_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  private formatearFecha(fecha: Date): string {
    if (!fecha) return "";
    const d = new Date(fecha);
    return d.toLocaleDateString("es-AR");
  }

  private formatearVehiculosRich(vehiculos: Vehiculo[]) {
    if (!vehiculos || vehiculos.length === 0) {
      return { richText: [{ text: "—" }] };
    }

    const richText: any[] = [];

    vehiculos.forEach((v, index) => {
      if (index > 0) {
        richText.push({ text: "\n" });
      }

      // Dominio en negrita
      richText.push({
        text: `${v.dominio} `,
        font: { bold: true },
      });

      // Marca y modelo normal
      richText.push({
        text: `(${v.marca} ${v.modelo} - `,
      });

      // Categoría en negrita
      richText.push({
        text: `${v.categoria?.nombre ?? ""}`,
        font: { bold: true },
      });

      // Cierre
      richText.push({
        text: `)`,
      });
    });

    return { richText };
  }

  ///////////////////
  /* RESUMEN VENTA */
  ////////////////////

  async exportarResumenVentaExcel(resumenVenta: ResumenVenta) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("Resumen Venta");

    // -----------------------
    // 📌 COLUMNAS (centrado visual)
    // dejamos espacio a izquierda y derecha
    // -----------------------
    worksheet.columns = [
      { width: 5 }, // margen izq
      { width: 27 },
      { width: 27 },
      { width: 27 },
      { width: 5 }, // margen der
    ];

    // -----------------------
    // 📌 LOGO
    // -----------------------
    const logoBase64 =
      "data:image/png;base64,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"; // Logo en formato base64

    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: "png",
    });

    worksheet.addImage(imageId, "A1:B3");

    let rowIndex = 6;

    // -----------------------
    // 📌 HEADER (debajo del logo)
    // -----------------------
    worksheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
    const titulo = worksheet.getCell(`B${rowIndex}`);
    titulo.value = `Resumen de Venta - ${this.getVendedor(resumenVenta.idVendedor)}`;
    titulo.font = { bold: true, size: 16 };
    //titulo.alignment = { horizontal: 'center' };

    rowIndex++;

    worksheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
    worksheet.getCell(`B${rowIndex}`).value =
      `Periodo: ${resumenVenta.periodo.mes}/${resumenVenta.periodo.anio}`;
    //worksheet.getCell(`B${rowIndex}`).alignment = { horizontal: 'center' };

    rowIndex++;

    //worksheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
    const totalHeader = worksheet.getCell(`B${rowIndex}`);
    totalHeader.value = `Total Liquidado:`;
    totalHeader.font = { bold: true };
    //totalHeader.alignment = { horizontal: 'center' };
    const totalValor = worksheet.getCell(`C${rowIndex}`);
    totalValor.value = resumenVenta.total;
    totalValor.numFmt = '"$"#,##0.00';
    totalValor.font = { bold: true, size: 12 };

    rowIndex++;

    rowIndex += 2;

    const headerTablaGlobalRow = rowIndex;

    const headerGlobal = worksheet.getRow(headerTablaGlobalRow);
    headerGlobal.values = ["", "Fecha", "Total Op", "Comisión"];

    headerGlobal.getCell(2).value = "Fecha";
    headerGlobal.getCell(3).value = "Total Op";
    headerGlobal.getCell(4).value = "Comisión";

    // opcional: ocultarla visualmente
    //headerGlobal.hidden = true;
    headerGlobal.font = { color: { argb: 'FFFFFFFF' } }; // blanco

    worksheet.pageSetup = {
      printTitlesRow: `$${headerTablaGlobalRow}:$${headerTablaGlobalRow}`,
    };

    rowIndex++;

    // -----------------------
    // 📌 LOOP CLIENTES
    // -----------------------
    for (const asig of resumenVenta.asignacionesExt) {
      const cardStartRow = rowIndex;

      // 🟦 HEADER CARD
      worksheet.mergeCells(`B${rowIndex}:D${rowIndex}`);
      const clienteCell = worksheet.getCell(`B${rowIndex}`);
      clienteCell.value = `Cliente: ${this.getClienteVendedor(asig.idCliente)}`;
      clienteCell.font = { bold: true };
      clienteCell.alignment = { horizontal: "center" };
      clienteCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };

      rowIndex++;

      // 🟨 Labels
      ["B", "C", "D"].forEach((col) => {
        const cell = worksheet.getCell(`${col}${rowIndex}`);
        cell.alignment = { horizontal: "center" };
        cell.font = { bold: true };
      });

      worksheet.getCell(`B${rowIndex}`).value = "Total Cliente";
      worksheet.getCell(`C${rowIndex}`).value = "Comisión";
      worksheet.getCell(`D${rowIndex}`).value = "Total Vendedor";

      rowIndex++;

      // 🟩 Valores (centrados + negrita)
      const valB = worksheet.getCell(`B${rowIndex}`);
      valB.value = asig.totalCliente;
      valB.numFmt = '"$"#,##0.00';
      valB.alignment = { horizontal: "center" };
      valB.font = { bold: true };

      const valC = worksheet.getCell(`C${rowIndex}`);
      valC.value = asig.porcentaje / 100;
      valC.numFmt = "0.00%";
      valC.alignment = { horizontal: "center" };
      valC.font = { bold: true };

      const valD = worksheet.getCell(`D${rowIndex}`);
      valD.value = asig.totalComision;
      valD.numFmt = '"$"#,##0.00';
      valD.alignment = { horizontal: "center" };
      valD.font = { bold: true };

      rowIndex += 2;

      // 🟨 HEADER TABLA
      const headerRow = worksheet.getRow(rowIndex);
      headerRow.values = ["", "Fecha", "Total Op", "Comisión"];

      headerRow.eachCell((cell, colNumber) => {
        if (colNumber >= 2 && colNumber <= 4) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: "center" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD9D9D9" },
          };
        }
      });

      rowIndex++;

      const startDataRow = rowIndex;

      const ops = this.getOpCliente(asig.idCliente, resumenVenta);

      for (const op of ops) {
        worksheet.getCell(`B${rowIndex}`).value = op.fecha;

        const totalCell = worksheet.getCell(`C${rowIndex}`);
        totalCell.value = op.totalCliente;
        totalCell.numFmt = '"$"#,##0.00';
        totalCell.alignment = { horizontal: "right" };

        const comCell = worksheet.getCell(`D${rowIndex}`);
        comCell.value = {
          formula: `C${rowIndex}*${asig.porcentaje}/100`,
        };
        comCell.numFmt = '"$"#,##0.00';
        comCell.alignment = { horizontal: "right" };

        rowIndex++;
      }

      const endDataRow = rowIndex - 1;

      // 🟥 SUB-TOTAL
      worksheet.getCell(`B${rowIndex}`).value = "Sub-total Vendedor";
      worksheet.getCell(`B${rowIndex}`).font = { bold: true };
      worksheet.getCell(`B${rowIndex}`).alignment = { horizontal: "center" };

      const totalCell = worksheet.getCell(`D${rowIndex}`);
      totalCell.value = {
        formula: `SUM(D${startDataRow}:D${endDataRow})`,
      };
      totalCell.numFmt = '"$"#,##0.00';
      totalCell.font = { bold: true };
      totalCell.alignment = { horizontal: "right" };

      // 🟪 BORDE SUPERIOR (divisor)
      ["B", "C", "D"].forEach((col) => {
        const cell = worksheet.getCell(`${col}${rowIndex}`);
        cell.border = {
          ...cell.border,
          top: { style: "medium" }, // podés probar 'thin' o 'thick'
        };
      });

      const cardEndRow = rowIndex;

      // 🟪 BORDE COMPLETO CARD (tipo caja)
      for (let r = cardStartRow; r <= cardEndRow; r++) {
        for (let c = 2; c <= 4; c++) {
          const cell = worksheet.getRow(r).getCell(c);

          const border: any = {};

          if (r === cardStartRow) border.top = { style: "thin" };
          if (r === cardEndRow) border.bottom = { style: "thin" };
          if (c === 2) border.left = { style: "thin" };
          if (c === 4) border.right = { style: "thin" };

          cell.border = {
            ...cell.border,
            ...border,
          };
        }
      }

      rowIndex += 3;
    }

    // -----------------------
    // 📌 DESCARGA
    // -----------------------
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ResumenVenta_${this.getVendedor(resumenVenta.idVendedor)}_${resumenVenta.periodo.mes}_${resumenVenta.periodo.anio}.xlsx`;
    a.click();

    window.URL.revokeObjectURL(url);
  }

  ////////////////////////////////////////
  /* METODOS AUXILIARES RESUMEN VENTA */
  ///////////////////////////////////////

  getVendedor(id: number): string {
    let vendedor;
    let vendedores = this.storageService.loadInfo("vendedores");
    vendedor = vendedores.find((v) => v.idVendedor === id);
    if (vendedor) {
      return (
        vendedor.datosPersonales.apellido +
        " " +
        vendedor.datosPersonales.nombre
      );
    } else {
      return "";
    }
  }

  getClienteVendedor(id: number): string {
    let cliente;
    let clientes = this.storageService.loadInfo("clientes");
    cliente = clientes.find((c) => c.idCliente === id);
    if (cliente) {
      return cliente.razonSocial;
    } else {
      return "";
    }
  }

  getOpCliente(id: number, resumen: ResumenVenta): OpVenta[] {
    let opCliente: OpVenta[] = resumen.operaciones.filter(
      (r) => r.idCliente === id,
    );
    opCliente.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return opCliente;
  }

  getTotalOpCliente(
    id: number,
    comision: number,
    resumen: ResumenVenta,
  ): number {
    let opCliente: OpVenta[] = resumen.operaciones.filter(
      (r) => r.idCliente === id,
    );
    let total = opCliente.reduce(
      (acc, obj) => acc + (obj.totalCliente * comision) / 100,
      0,
    );
    return total;
  }
}
