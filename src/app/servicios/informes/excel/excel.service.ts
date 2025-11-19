import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
import { Categoria, Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';



import { CellValue } from 'exceljs';



import { Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from '../../storage/storage.service';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { Borders, Fill, Workbook } from 'exceljs';
import saveAs from 'file-saver';
import { InformeOp } from 'src/app/interfaces/informe-op';
import { InformeLiq } from 'src/app/interfaces/informe-liq';

type ChoferAsignado = ConIdType<Chofer> & {
  categoriaAsignada: Categoria;
  observaciones: string;
  hojaDeRuta: string;
  tEventual:boolean;
};

interface MetadataChofer {
  id: string;
  observaciones: string;
  hojaDeRuta: string;
  celda: string;
}


@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  factura!: InformeLiq
  private readonly CATEGORIAS_TEXTO_CLARO = [
    'bg-dark', 'bg-secondary', 'bg-danger', 'bg-primary'
  ];

  constructor(private storageService: StorageService) { }

  async exportToExcelInforme(
    informeLiq: InformeLiq,
    informesOp: InformeOp[],
    clientes: Cliente[],
    choferes: Chofer[], 
    modo:string,
  ) {
    const titulo = modo === 'factura' ? `Liquidación de Servicios ${informeLiq.entidad.razonSocial}` : `Proforma ${informeLiq.entidad.razonSocial}`;
    const subTitulo = modo === 'factura' ? `${informeLiq.numeroInterno}`: `${informeLiq.idInfLiq}`;
    const nombreDoc = modo === 'factura' ? `Detalle_${informeLiq.entidad.razonSocial}_${informeLiq.fecha}.xlsx` : `Proforma_${informeLiq.entidad.razonSocial}_${informeLiq.fecha}.xlsx`

    await this.exportarExcelInfomeOpLiquidadas(
      informeLiq,
      informesOp,
      clientes,
      choferes,       
      titulo,
      subTitulo,
      nombreDoc
    );
  }


  async exportarExcelInfomeOpLiquidadas(
  informeLiq: InformeLiq,
  informesOp: InformeOp[],
  clientes: Cliente[],
  choferes: Chofer[],     
  titulo: string,
  subtitulo:string,
  nombreDoc: string,  
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Datos');
  const periodo = informeLiq.periodo === 'mes' ? 'mes' : this.getQuincena(informesOp[0].fecha) === 'Primera' ? 'primer quincena' : 'segunda quincena';

  // Logo
  const logoBase64 = 'data:image/png;base64,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'; // Logo en formato base64
  const imageId = workbook.addImage({
    base64: logoBase64,
    extension: 'png',
  });
  worksheet.addImage(imageId, 'A1:B3');

  // Título
  worksheet.mergeCells('A5:F5');
  const titleCell = worksheet.getCell('A5');
  titleCell.value = titulo;
  titleCell.font = { size: 16, bold: true };

  // Subtítulo
  worksheet.mergeCells('A6:F6');
  const subTitleCell = worksheet.getCell('A6');
  subTitleCell.value = `Año: ${new Date(informeLiq.fecha).getFullYear()} Mes: ${informeLiq.mes} - Periodo Liquidado: ${periodo}`;
  subTitleCell.font = { size: 12, bold: true };

  // Subtítulo adicional
  worksheet.mergeCells('A7:F7');
  const subTitleCell2 = worksheet.getCell('A7');
  subTitleCell2.value = subtitulo;
  subTitleCell2.font = { size: 8 };

  // Encabezados
  worksheet.addRow(informeLiq.columnas).eachCell((cell) => {
    cell.font = { size: 12, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'top' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

    // Filas dinámicas
  informesOp.forEach((informeOp) => {
    const row = worksheet.addRow(
    informeLiq.columnas.map((columna) => {
        if (['Jornada', 'Ad Km', 'Acomp', 'A Cobrar'].includes(columna)) {
          return this.obtenerDatos(informeLiq, informeOp, clientes, columna, choferes); // true = retorno numérico
        }
        return this.obtenerDatos(informeLiq, informeOp, clientes, columna, choferes);
      })
    );

    // Aplicar estilo + formato contable para columnas numéricas
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const columnaNombre = informeLiq.columnas[colNumber - 1]; // -1 porque colNumber es 1-based
      cell.font = { size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'top' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };

      if (['Jornada', 'Ad Km', 'Acomp', 'A Cobrar'].includes(columnaNombre)) {
        cell.numFmt = '"$"#,##0.00'; // formato contable en Excel
      }
    });

  });

    // Subtotal (si hay descuentos)
  if (informeLiq.descuentos.length > 0) {
    // Subtotal fila
    const subtotalRow = worksheet.addRow([]);
    worksheet.mergeCells(`A${subtotalRow.number}:${String.fromCharCode(64 + informeLiq.columnas.length - 1)}${subtotalRow.number}`);
    subtotalRow.getCell(1).value = 'Sub Total';
    subtotalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    //
    const subtotalValor = informeLiq.valores.totalTarifaBase + informeLiq.valores.totalAcompaniante + informeLiq.valores.totalkmMonto;
    subtotalRow.getCell(informeLiq.columnas.length).value = subtotalValor;
    subtotalRow.getCell(informeLiq.columnas.length).numFmt = '"$"#,##0.00';
    subtotalRow.getCell(informeLiq.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
    //
  
    subtotalRow.eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  
    // Fila de descuentos
    informeLiq.descuentos.forEach((descuento) => {
      const descuentoRow = worksheet.addRow([]);
      worksheet.mergeCells(`A${descuentoRow.number}:${String.fromCharCode(64 + informeLiq.columnas.length - 1)}${descuentoRow.number}`);
      descuentoRow.getCell(1).value = descuento.concepto;
      descuentoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      //
      descuentoRow.getCell(informeLiq.columnas.length).value = descuento.valor;
      descuentoRow.getCell(informeLiq.columnas.length).numFmt = '"$"#,##0.00';
      //

      descuentoRow.getCell(informeLiq.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
  
      descuentoRow.eachCell((cell) => {
        cell.font = { size: 12, bold: false }; // Mantener consistencia con el footer
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul como el footer
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

   // Total final
  const totalRow = worksheet.addRow([]);
  worksheet.mergeCells(`A${totalRow.number}:${String.fromCharCode(64 + informeLiq.columnas.length - 1)}${totalRow.number}`);
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  //
  totalRow.getCell(informeLiq.columnas.length).value = informeLiq.valores.total;
  totalRow.getCell(informeLiq.columnas.length).numFmt = '"$"#,##0.00';
  //

  totalRow.getCell(informeLiq.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
  
  totalRow.eachCell((cell) => {
    cell.font = { size: 12, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul como el resto del footer
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
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
      cell.alignment = { wrapText: true, vertical: 'middle'}; // Ajustar texto y centrar
    });
  });

  // Configuración del ancho de las columnas basadas en el contenido esperado
  worksheet.columns = informeLiq.columnas.map((columna) => {
    switch (columna) {
      case 'Fecha':
        return { key: columna, width: 12 }; // yyyy-mm-dd tiene un ancho ideal de 12
      case 'Quincena':
        return { key: columna, width: 11 }; // "Primera" o "Segunda" requiere un ancho de 10
      case 'Km':
        return { key: columna, width: 5 }; // 3 dígitos + espacio adicional
      case 'Patente':
        return { key: columna, width: 10 }; // "Primera" o "Segunda" requiere un ancho de 10
      case 'Hoja de Ruta':
        return { key: columna, width: 14 }; // "Primera" o "Segunda" requiere un ancho de 10
      default:
        return { key: columna, width: 25 }; // Ancho estándar para otras columnas
    }
  });

  // Ajustar alineación del texto y permitir saltos de línea en todas las celdas
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'middle' }; // Ajustar texto y centrar
    });
  });

  // Guardar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), nombreDoc);
}
  

  getQuincena(fecha: any): string {
    //console.log("fecha: ", fecha);
    
    // Dividir el string de la fecha en año, mes y día
    const [year, month, day] = fecha.split('-').map(Number);
    
    // Crear la fecha asegurando que tome la zona horaria local
    const date = new Date(year, month - 1, day); // mes - 1 porque los meses en JavaScript son 0-indexed

    // Determinar si está en la primera o segunda quincena
    return day <= 15 ? 'Primera' : 'Segunda';
  }

  getChofer(idChofer:number, choferes: Chofer[]){
    let chofer: Chofer []
    chofer = choferes.filter((c:Chofer)=>{
      return c.idChofer === idChofer
    });
    return chofer[0].apellido + " " + chofer[0].nombre
  }

  getCliente(idCliente:number, clientes: Cliente[]){
    let cliente: Cliente []
    cliente = clientes.filter((c:Cliente)=>{
      return c.idCliente === idCliente
    });
    return cliente[0].razonSocial;
  }

  getProveedor(idProveedor:number){
    let proveedores: Proveedor [] = this.storageService.loadInfo("proveedores")
    let proveedorOp : Proveedor [];   
    
    proveedorOp = proveedores.filter((p:Proveedor)=>{
      return p.idProveedor === idProveedor
    });
    return proveedorOp[0].razonSocial;
  }

  getCategoria(patente:string, idChofer:number){
    let veh: Vehiculo[];   
    let choferSel: Chofer[];    
    let choferesStorage: Chofer[] = this.storageService.loadInfo("choferes")
    choferSel = choferesStorage.filter((c:Chofer)=> {return c.idChofer === idChofer});
    veh = choferSel[0].vehiculo.filter((v:Vehiculo)=>{return v.dominio === patente});    
    return veh[0].categoria.nombre;
  }

  obtenerDatos(factura: InformeLiq, informeOp: InformeOp, clientes: Cliente[], columna: any, choferes:Chofer[]){      
      
    switch (columna) {
      case 'Fecha':{          
        return informeOp.fecha;
      };
      case 'Quincena':{          
        return this.getQuincena(informeOp.fecha);
      };        
      case 'Chofer':{          
        return this.getChofer(informeOp.idChofer, choferes);
      };
      case 'Cliente':{          
        return this.getCliente(informeOp.idCliente, clientes);
      };
      case 'Patente':{          
        return informeOp.patente;
      };
      case 'Concepto':{       
        return this.getCategoria(informeOp.patente, informeOp.idChofer);
      };
      case 'Observaciones':{       
        return informeOp.observaciones;
      };
      case 'Hoja de Ruta':{          
        return informeOp.hojaRuta;
      };
      case "Km":{          
        return informeOp.km;
      };
      case "Jornada":{          
        return informeOp.valores.tarifaBase;
      };
      case "Ad Km":{          
        return informeOp.valores.kmMonto;
      };
      case "Acomp":{          
        return informeOp.valores.acompaniante;
      };
      case "A Cobrar":{          
        return informeOp.valores.total;
      };
      default:{
        return ''
      }
    }    
  }


  // Reportes EXCEL para los clientes
/*   async exportToExcelCliente(
    factura: InformeLiq,
    facturasOp: InformeOp[],
    clientes: Cliente[],
    choferes: Chofer[], 
    modo:string,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factura');

    // Logo
    const logoBase64 = 'data:image/png;base64,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'; // Logo en formato base64
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, 'A1:B3');

    // Título
    worksheet.mergeCells('A5:F5');
    const titleCell = worksheet.getCell('A5');
    titleCell.value = modo === 'factura' ? `Liquidación de Servicios ${factura.entidad.razonSocial}` : `Proforma ${factura.entidad.razonSocial}`;
    titleCell.font = { size: 16, bold: true };

    // Subtítulo
    worksheet.mergeCells('A6:F6');
    const subTitleCell = worksheet.getCell('A6');
    subTitleCell.value = `Año: ${new Date(factura.fecha).getFullYear()} Mes: ${new Date(factura.fecha).toLocaleString('default', { month: 'long' })}`;
    subTitleCell.font = { size: 12, bold: true };

    // Subtítulo adicional
    worksheet.mergeCells('A7:F7');
    const subTitleCell2 = worksheet.getCell('A7');
    subTitleCell2.value = modo === 'factura' ? `${factura.idInfLiq}`: '';
    subTitleCell2.font = { size: 8 };

    // Encabezados
    worksheet.addRow(factura.columnas).eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'top' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Filas dinámicas
    facturasOp.forEach((facturaOp) => {
      const row = worksheet.addRow(
    factura.columnas.map((columna) => {
      if (['Jornada', 'Ad Km', 'Acomp', 'A Cobrar'].includes(columna)) {
        return this.obtenerDatos(factura, facturaOp, clientes, columna, choferes); // true = retorno numérico
      }
      return this.obtenerDatos(factura, facturaOp, clientes, columna, choferes);
    })
  );

  // Aplicar estilo + formato contable para columnas numéricas
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const columnaNombre = factura.columnas[colNumber - 1]; // -1 porque colNumber es 1-based
    cell.font = { size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'top' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    if (['Jornada', 'Ad Km', 'Acomp', 'A Cobrar'].includes(columnaNombre)) {
      cell.numFmt = '"$"#,##0.00'; // formato contable en Excel
    }
  });

    });

    // Pie de tabla (Footer)
    //const lastRowIndex = worksheet.lastRow?.number || 1;
    

    // Subtotal (si hay descuentos)
    if (factura.valores.descuentoTotal > 0) {
      // Subtotal fila
      const subtotalRow = worksheet.addRow([]);
      worksheet.mergeCells(`A${subtotalRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${subtotalRow.number}`);
      subtotalRow.getCell(1).value = 'Sub Total';
      subtotalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      //
      const subtotalValor = factura.valores.totalTarifaBase + factura.valores.totalAcompaniante + factura.valores.totalkmMonto;
      subtotalRow.getCell(factura.columnas.length).value = subtotalValor;
      subtotalRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';
      subtotalRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
      //
    
      subtotalRow.eachCell((cell) => {
        cell.font = { size: 12, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    
      // Fila de descuentos
      factura.descuentos.forEach((descuento) => {
        const descuentoRow = worksheet.addRow([]);
        worksheet.mergeCells(`A${descuentoRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${descuentoRow.number}`);
        descuentoRow.getCell(1).value = descuento.concepto;
        descuentoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        //
        descuentoRow.getCell(factura.columnas.length).value = -descuento.valor;
        descuentoRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';
        //

        descuentoRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
    
        descuentoRow.eachCell((cell) => {
          cell.font = { size: 12, bold: false }; // Mantener consistencia con el footer
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul como el footer
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });
    }
    
    // Total final
    const totalRow = worksheet.addRow([]);
    worksheet.mergeCells(`A${totalRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${totalRow.number}`);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    //
    totalRow.getCell(factura.columnas.length).value = factura.valores.total;
    totalRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';
    //

    totalRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
    
    totalRow.eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul como el resto del footer
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
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
      cell.alignment = { wrapText: true, vertical: 'middle'}; // Ajustar texto y centrar
    });
  });

  // Configuración del ancho de las columnas basadas en el contenido esperado
  worksheet.columns = factura.columnas.map((columna) => {
    switch (columna) {
      case 'Fecha':
        return { key: columna, width: 12 }; // yyyy-mm-dd tiene un ancho ideal de 12
      case 'Quincena':
        return { key: columna, width: 11 }; // "Primera" o "Segunda" requiere un ancho de 10
      case 'Km':
        return { key: columna, width: 5 }; // 3 dígitos + espacio adicional
      case 'Patente':
        return { key: columna, width: 10 }; // "Primera" o "Segunda" requiere un ancho de 10
      case 'Hoja de Ruta':
        return { key: columna, width: 14 }; // "Primera" o "Segunda" requiere un ancho de 10
      default:
        return { key: columna, width: 25 }; // Ancho estándar para otras columnas
    }
  });

  // Ajustar alineación del texto y permitir saltos de línea en todas las celdas
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'middle' }; // Ajustar texto y centrar
    });
  });

    // Guardar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), modo === 'factura' ? `Detalle_${factura.entidad.razonSocial}_${factura.fecha}.xlsx` : `Proforma_${factura.entidad.razonSocial}_${factura.fecha}.xlsx`);
  }


  // Reportes EXCEL para los choferes
  async exportToExcelChofer(
    factura: InformeLiq, 
    facturasOp: InformeOp[], 
    clientes:Cliente[], 
    choferes: Chofer[], 
    modo:string,
  ): Promise<void> {  

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factura');

    // Logo
    const logoBase64 = 'data:image/png;base64,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'; // Logo en formato base64
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, 'A1:B3');

    // Título
    worksheet.mergeCells('A5:F5');
    const titleCell = worksheet.getCell('A5');
    titleCell.value = modo === 'factura' ? `Liquidación de Servicios ${factura.entidad.razonSocial}  ` : `Proforma ${factura.entidad.razonSocial}`;
    titleCell.font = { size: 16, bold: true };

    // Subtítulo
    worksheet.mergeCells('A6:F6');
    const subTitleCell = worksheet.getCell('A6');
    subTitleCell.value = `Año: ${new Date(factura.fecha).getFullYear()} Mes: ${new Date(factura.fecha).toLocaleString('default', { month: 'long' })}`;
    subTitleCell.font = { size: 12, bold: true };

    // Subtítulo adicional
    worksheet.mergeCells('A7:F7');
    const subTitleCell2 = worksheet.getCell('A7');
    subTitleCell2.value = modo === 'factura' ? `${factura.idInfLiq}` : '';
    subTitleCell2.font = { size: 8 };

    // Encabezados
    worksheet.addRow(factura.columnas).eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'top' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Filas dinámicas
    facturasOp.forEach((facturaOp) => {
      const row = worksheet.addRow(
    factura.columnas.map((columna) => {
      if (['Jornada', 'Ad Km', 'Acomp', 'A Cobrar'].includes(columna)) {
        return this.obtenerDatos(factura, facturaOp, clientes, columna, choferes); // true = retorno numérico
      }
      return this.obtenerDatos(factura, facturaOp, clientes, columna, choferes);
    })
  );

  // Aplicar estilo + formato contable para columnas numéricas
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const columnaNombre = factura.columnas[colNumber - 1]; // -1 porque colNumber es 1-based
    cell.font = { size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'top' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    if (['Jornada', 'Ad Km', 'Acomp', 'A Cobrar'].includes(columnaNombre)) {
      cell.numFmt = '"$"#,##0.00'; // formato contable en Excel
    }
  });

    });

    // Pie de tabla (Footer)
    //const lastRowIndex = worksheet.lastRow?.number || 1;
    

    // Subtotal (si hay descuentos)
    if (factura.valores.descuentoTotal > 0) {
      // Subtotal fila
      const subtotalRow = worksheet.addRow([]);
      worksheet.mergeCells(`A${subtotalRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${subtotalRow.number}`);
      subtotalRow.getCell(1).value = 'Sub Total';
      subtotalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      const subtotalValor = factura.valores.totalTarifaBase + factura.valores.totalAcompaniante + factura.valores.totalkmMonto;
      subtotalRow.getCell(factura.columnas.length).value = subtotalValor;
      subtotalRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';
      subtotalRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };

    
      subtotalRow.eachCell((cell) => {
        cell.font = { size: 12, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    
      // Fila de descuentos
      factura.descuentos.forEach((descuento) => {
        const descuentoRow = worksheet.addRow([]);
        worksheet.mergeCells(`A${descuentoRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${descuentoRow.number}`);
        descuentoRow.getCell(1).value = descuento.concepto;
        descuentoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        descuentoRow.getCell(factura.columnas.length).value = -descuento.valor;
        descuentoRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';

        descuentoRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
    
        descuentoRow.eachCell((cell) => {
          cell.font = { size: 12, bold: false }; // Mantener consistencia con el footer
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul como el footer
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });
    }
    
    // Total final
    const totalRow = worksheet.addRow([]);
    worksheet.mergeCells(`A${totalRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${totalRow.number}`);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    totalRow.getCell(factura.columnas.length).value = factura.valores.total;
    totalRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';

    totalRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
    
    totalRow.eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul como el resto del footer
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
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
      cell.alignment = { wrapText: true, vertical: 'middle'}; // Ajustar texto y centrar
    });
  });

  // Configuración del ancho de las columnas basadas en el contenido esperado
  worksheet.columns = factura.columnas.map((columna) => {
    switch (columna) {
      case 'Fecha':
        return { key: columna, width: 12 }; // yyyy-mm-dd tiene un ancho ideal de 12
      case 'Quincena':
        return { key: columna, width: 11 }; // "Primera" o "Segunda" requiere un ancho de 10
      case 'Km':
        return { key: columna, width: 5 }; // 3 dígitos + espacio adicional
      case 'Patente':
        return { key: columna, width: 10 }; // "Primera" o "Segunda" requiere un ancho de 10
      case 'Hoja de Ruta':
        return { key: columna, width: 14 }; // "Primera" o "Segunda" requiere un ancho de 10
      default:
        return { key: columna, width: 25 }; // Ancho estándar para otras columnas
    }
  });

  // Ajustar alineación del texto y permitir saltos de línea en todas las celdas
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'middle' }; // Ajustar texto y centrar
    });
  });

    // Guardar archivo
    const buffer = await workbook.xlsx.writeBuffer();
      FileSaver.saveAs(new Blob([buffer]), modo === 'factura' ? `Detalle_${factura.entidad.razonSocial}_${factura.fecha}.xlsx` : `Proforma_${factura.entidad.razonSocial}_${factura.fecha}.xlsx`);

  }



  ////////////// Reportes EXCEL para los proveedores
  async exportToExcelProveedor(factura: InformeLiq, facturasOp: InformeOp[], clientes: Cliente[], choferes: Chofer[], modo:string): Promise<void> {
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factura');

    // Logo
    const logoBase64 = 'data:image/png;base64,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'; // Logo en formato base64
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, 'A1:B3');

    // Título
    worksheet.mergeCells('A5:F5');
    const titleCell = worksheet.getCell('A5');
    titleCell.value = modo === 'factura' ? `Liquidación de Servicios ${factura.entidad.razonSocial}` : `Proforma ${factura.entidad.razonSocial}`;
    titleCell.font = { size: 16, bold: true };

    // Subtítulo
    worksheet.mergeCells('A6:F6');
    const subTitleCell = worksheet.getCell('A6');
    subTitleCell.value = `Año: ${new Date(factura.fecha).getFullYear()} Mes: ${new Date(factura.fecha).toLocaleString('default', { month: 'long' })}`;
    subTitleCell.font = { size: 12, bold: true };

    // Subtítulo adicional
    worksheet.mergeCells('A7:F7');
    const subTitleCell2 = worksheet.getCell('A7');
    subTitleCell2.value = modo === 'factura' ? `${factura.idInfLiq}` : '';
    subTitleCell2.font = { size: 8 };

    // Encabezados
    worksheet.addRow(factura.columnas).eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'top' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Filas dinámicas
    facturasOp.forEach((facturaOp) => {
      const row = worksheet.addRow(
    factura.columnas.map((columna) => {
      if (['Jornada', 'Ad Km', 'Acomp', 'A Cobrar'].includes(columna)) {
        return this.obtenerDatos(factura, facturaOp, clientes, columna, choferes); // true = retorno numérico
      }
      return this.obtenerDatos(factura, facturaOp, clientes, columna, choferes);
    })
  );

  // Aplicar estilo + formato contable para columnas numéricas
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const columnaNombre = factura.columnas[colNumber - 1]; // -1 porque colNumber es 1-based
    cell.font = { size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'top' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };

    if (['Jornada', 'Ad Km', 'Acomp', 'A Cobrar'].includes(columnaNombre)) {
      cell.numFmt = '"$"#,##0.00'; // formato contable en Excel
    }
  });

    });

    // Pie de tabla (Footer)
    //const lastRowIndex = worksheet.lastRow?.number || 1;
    

    // Subtotal (si hay descuentos)
    if (factura.valores.descuentoTotal > 0) {
      // Subtotal fila
      const subtotalRow = worksheet.addRow([]);
      worksheet.mergeCells(`A${subtotalRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${subtotalRow.number}`);
      subtotalRow.getCell(1).value = 'Sub Total';
      subtotalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      const subtotalValor = factura.valores.totalTarifaBase + factura.valores.totalAcompaniante + factura.valores.totalkmMonto;
      subtotalRow.getCell(factura.columnas.length).value = subtotalValor;
      subtotalRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';
      subtotalRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };

    
      subtotalRow.eachCell((cell) => {
        cell.font = { size: 12, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    
      // Fila de descuentos
      factura.descuentos.forEach((descuento) => {
        const descuentoRow = worksheet.addRow([]);
        worksheet.mergeCells(`A${descuentoRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${descuentoRow.number}`);
        descuentoRow.getCell(1).value = descuento.concepto;
        descuentoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        descuentoRow.getCell(factura.columnas.length).value = -descuento.valor;
        descuentoRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';

        descuentoRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
    
        descuentoRow.eachCell((cell) => {
          cell.font = { size: 12, bold: false }; // Mantener consistencia con el footer
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul como el footer
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });
    }
    
    // Total final
    const totalRow = worksheet.addRow([]);
    worksheet.mergeCells(`A${totalRow.number}:${String.fromCharCode(64 + factura.columnas.length - 1)}${totalRow.number}`);
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    totalRow.getCell(factura.columnas.length).value = factura.valores.total;
    totalRow.getCell(factura.columnas.length).numFmt = '"$"#,##0.00';

    totalRow.getCell(factura.columnas.length).alignment = { horizontal: 'center', vertical: 'middle' };
    
    totalRow.eachCell((cell) => {
      cell.font = { size: 12, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } }; // Azul como el resto del footer
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
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
      cell.alignment = { wrapText: true, vertical: 'middle'}; // Ajustar texto y centrar
    });
  });

  // Configuración del ancho de las columnas basadas en el contenido esperado
  worksheet.columns = factura.columnas.map((columna) => {
    switch (columna) {
      case 'Fecha':
        return { key: columna, width: 12 }; // yyyy-mm-dd tiene un ancho ideal de 12
      case 'Quincena':
        return { key: columna, width: 11 }; // "Primera" o "Segunda" requiere un ancho de 10
      case 'Km':
        return { key: columna, width: 5 }; // 3 dígitos + espacio adicional
      case 'Patente':
        return { key: columna, width: 10 }; // "Primera" o "Segunda" requiere un ancho de 10
      case 'Hoja de Ruta':
        return { key: columna, width: 14 }; // "Primera" o "Segunda" requiere un ancho de 10
      default:
        return { key: columna, width: 25 }; // Ancho estándar para otras columnas
    }
  });

  // Ajustar alineación del texto y permitir saltos de línea en todas las celdas
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'middle' }; // Ajustar texto y centrar
    });
  });

    // Guardar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), modo === 'factura' ? `Detalle_${factura.entidad.razonSocial}_${factura.fecha}.xlsx` : `Proforma_${factura.entidad.razonSocial}_${factura.fecha}.xlsx`);

  } */

  ////////////// informe EXCEL del tablero de Operaciones
  generarInformeOperaciones(fechaDesde: string, fechaHasta: string, operaciones: Operacion[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Informe');

    // Fila 1 - Fecha Desde
    worksheet.addRow(['Desde:', fechaDesde]);
    // Fila 2 - Fecha Hasta
    worksheet.addRow(['Hasta:', fechaHasta]);
    worksheet.addRow([]); // fila vacía
  // Fila 4 - Encabezados combinados "Cliente" y "Chofer"
  worksheet.mergeCells('E4:I4');
  worksheet.getCell('E4').value = 'Cliente';
  worksheet.getCell('E4').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('E4').font = { bold: true };

  worksheet.mergeCells('J4:Q4');
  worksheet.getCell('J4').value = 'Chofer';
  worksheet.getCell('J4').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getCell('J4').font = { bold: true };
  // Establecer bordes para la celda combinada "Cliente" (E4:I4)
  const clienteHeaderCell = worksheet.getCell('E4');
  clienteHeaderCell.border = {
    top: { style: 'medium' },
    bottom: { style: 'medium' },
    left: { style: 'medium' },
    right: { style: 'medium' },
  };

  // Establecer bordes para la celda combinada "Chofer" (J4:Q4)
  const choferHeaderCell = worksheet.getCell('J4');
  choferHeaderCell.border = {
    top: { style: 'medium' },
    bottom: { style: 'medium' },
    left: { style: 'medium' },
    right: { style: 'medium' },
  };

  // Fila 5 - Encabezados de columna
  const headers = [
    'Estado', 'Fecha', 'idOperacion', 'Km',
    'Razon Social', 'Tarifa Base', 'Adicional Km', 'Acompañante', 'Total Op',
    'Nombre', 'Proveedor', 'Patente', 'Categoria',
    'Tarifa Base', 'Adicional Km', 'Acompañante', 'Total Op',
    'Acompañante', 'Hoja de Ruta', 'Observacion'
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };



  // Estilo de color para secciones del encabezado
  const headerStyle = (cell: ExcelJS.Cell, bgColor: string) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor.replace('#', '') },
    };
    cell.font = { bold: true };
  };

  // A5:D5 – Azul Oscuro, texto 2, claro 80%
  ['A5', 'B5', 'C5', 'D5'].forEach(cell => headerStyle(worksheet.getCell(cell), '#D9E1F2'));

  // Cliente – E4 (título) y E5:I5
  ['E4', 'E5', 'F5', 'G5', 'H5', 'I5'].forEach(cell => headerStyle(worksheet.getCell(cell), '#FCE4D6'));

  // Chofer – J4 (título) y J5:Q5
  ['J4', 'J5', 'K5', 'L5', 'M5', 'N5', 'O5', 'P5', 'Q5'].forEach(cell => headerStyle(worksheet.getCell(cell), '#D9EAD3'));

  // R5:T5 – Anaranjado, Énfasis 6, claro 80%
  ['R5', 'S5', 'T5'].forEach(cell => headerStyle(worksheet.getCell(cell), '#FFE699'));



    // Datos
    operaciones.forEach(op => {
      const estado = op.estado.abierta
        ? 'Abierta'
        : op.estado.cerrada
        ? 'Cerrada'
        : op.estado.facturada
        ? 'Facturada'
        : op.estado.facCliente
        ? 'Cliente Fac'
        : op.estado.facChofer
        ? 'Chofer Fac'
        : 'Sin Datos';

      const proveedor = op.chofer.idProveedor === 0 ? "No" : this.getProveedor(op.chofer.idProveedor);
      const categoria = this.getCategoria(op.patenteChofer, op.chofer.idChofer)

      worksheet.addRow([
        estado,
        op.fecha,
        op.idOperacion,
        op.km,

        // Cliente
        op.cliente.razonSocial,
        op.valores.cliente.tarifaBase,
        op.valores.cliente.kmAdicional,
        op.valores.cliente.acompValor,
        op.valores.cliente.aCobrar,

        // Chofer
        op.chofer.apellido + " " +  op.chofer.nombre,
        proveedor,
        op.patenteChofer,
        categoria,
        op.valores.chofer.tarifaBase,
        op.valores.chofer.kmAdicional,
        op.valores.chofer.acompValor,
        op.valores.chofer.aPagar,

        // Otros
        op.acompaniante ? 'Sí' : 'No',
        op.hojaRuta,
        op.observaciones,
      ]);
    });

    // Estilo de encabezados
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(5).font = { bold: true };

    
    // Aplicar formato numérico sin decimales a la columna C (idOperacion)
    worksheet.getColumn('C').numFmt = '0';

    // Formato moneda con dos decimales
  const currencyFormat = '"$"#,##0.00'; // O usá '[$$-en-US]#,##0.00' si querés el formato dólar explícito

  ['F', 'G', 'H', 'I', 'N', 'O', 'P', 'Q'].forEach((col) => {
    worksheet.getColumn(col).numFmt = currencyFormat;
  });

    // Auto ajuste de ancho de columnas
    worksheet.columns.forEach((column) => {
      if (!column) return;
    
      let maxLength = 0;
    
      if (typeof column.eachCell === 'function') {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length);
        });
      }
    
      column.width = maxLength + 1;
    });

    // Rango de datos
  const startRow = 5;
  const endRow = worksheet.lastRow?.number;
  const totalColumns = headers.length;

  // Aplicar bordes
  if(endRow){
    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const row = worksheet.getRow(rowNum);
      for (let colNum = 1; colNum <= totalColumns; colNum++) {
        const cell = row.getCell(colNum);
    
        // Borde básico interior (todos los lados thin por defecto)
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
    
        // Borde exterior grueso (fila superior e inferior, columna izquierda y derecha)
        if (rowNum === startRow) {
          cell.border.top = { style: 'medium' };
        }
        if (rowNum === endRow) {
          cell.border.bottom = { style: 'medium' };
        }
        if (colNum === 1) {
          cell.border.left = { style: 'medium' };
        }
        if (colNum === totalColumns) {
          cell.border.right = { style: 'medium' };
        }
    
        // Línea divisoria gruesa entre encabezado y datos (solo fila 5 inferior)
        if (rowNum === startRow) {
          cell.border.bottom = { style: 'medium' };
        }
    
        // Bordes verticales entre secciones
        if ([4, 9, 17].includes(colNum)) {
          cell.border.right = { style: 'medium' };
        }
      }
    }
  }

    // Guardar archivo
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      FileSaver.saveAs(blob, `InformeOperaciones_${fechaDesde}_a_${fechaHasta}.xlsx`);
    
    });
  }

 /** Crea y descarga el tablero en Excel */
  async generarInformeAsignaciones(
    asignaciones: { [idCliente: number]: ChoferAsignado[] },
    todosClientes: ConIdType<Cliente>[],
    choferesAgrupadosPorCategoria: { nombre: string; catOrden: number; choferes: ConId<Chofer>[] }[],
    choferesInactivos: ConIdType<Chofer>[],
    fechaSeleccionada: string,
    sectionColorClasses: string[]
  ): Promise<void> {
    // Crear un nuevo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asignaciones');
    const metadata: any[] = [];
    const existingMetaSheet = workbook.getWorksheet('_metadata');
    if (existingMetaSheet) {
      workbook.removeWorksheet(existingMetaSheet.id);
    }
    // 1. Configuración inicial
    worksheet.properties.defaultColWidth = 15;
    
    // 2. Fila 1: Operaciones del día
    const fechaRow = worksheet.getRow(1);
    fechaRow.getCell(1).value = 'Operaciones del dia:';
    fechaRow.getCell(2).value = fechaSeleccionada;
    fechaRow.getCell(1).font = { bold: true };
    
    
    // Combinar celdas para el título de fecha
    //worksheet.mergeCells('A1:B1');

// 3. Fila 2: Títulos
  const titulosRow = worksheet.getRow(2);
  titulosRow.getCell(1).value = 'Clientes Asignados';
  
  // Obtener clientes CON asignaciones (array no vacío)
  const clientesConAsignaciones = todosClientes.filter(cliente => {
    const asignacionesCliente = asignaciones[cliente.idCliente];
    return asignacionesCliente && asignacionesCliente.length > 0;
  });

  // 4. Tabla de clientes asignados (desde fila 3)
  // Encabezados solo para clientes con asignaciones
  clientesConAsignaciones.forEach((cliente, index) => {
    const headerCell = worksheet.getCell(3, index + 1);
    headerCell.value = cliente.razonSocial;
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' } // Gris claro
    };
    headerCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
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
            cat => cat.catOrden === choferAsignado.categoriaAsignada.catOrden
          );
          
          this.setCellWithMetadata(
            cell, 
            choferAsignado, 
            workbook,
            categoriaIndex,
            sectionColorClasses
          );
        }
      
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }

  // 5. Clientes SIN asignaciones (a la derecha, con columna en blanco)
  const clientesSinAsignaciones = todosClientes.filter(cliente => {
    const asignacionesCliente = asignaciones[cliente.idCliente];
    return !asignacionesCliente || asignacionesCliente.length === 0;
  });
  // 5. Clientes SIN asignaciones (organizados en columnas según espacio)
const columnaInicioSinAsignaciones = clientesConAsignaciones.length + 2;
const filaInicioSinAsignaciones = 3;
const maxFilasTablaAsignaciones = 15; // Altura de la tabla de asignaciones

// Título (combinado para todas las columnas de sin asignaciones)
worksheet.getCell(2, columnaInicioSinAsignaciones).value = 'Clientes sin Asignaciones';
worksheet.getCell(2, columnaInicioSinAsignaciones).font = { bold: true };
worksheet.mergeCells(
  2, columnaInicioSinAsignaciones, 
  2, columnaInicioSinAsignaciones + Math.ceil(clientesSinAsignaciones.length / maxFilasTablaAsignaciones) - 1
);

// Dividir clientes sin asignaciones en grupos para cada columna
const gruposSinAsignaciones = this.chunkArray(clientesSinAsignaciones, maxFilasTablaAsignaciones);

gruposSinAsignaciones.forEach((grupo, grupoIndex) => {
  const columnaActual = columnaInicioSinAsignaciones + grupoIndex;
  
  grupo.forEach((cliente, index) => {
    const filaActual = filaInicioSinAsignaciones + index;
    const cell = worksheet.getCell(filaActual, columnaActual);
    
    cell.value = cliente.razonSocial;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' } // Gris claro
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Aplicar bordes a celdas vacías si el grupo no llega al máximo
  if (grupo.length < maxFilasTablaAsignaciones) {
    for (let i = grupo.length; i < maxFilasTablaAsignaciones; i++) {
      const cell = worksheet.getCell(filaInicioSinAsignaciones + i, columnaActual);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' } // Blanco
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
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
    const bgColor = this.mapColorClassToExcelColor(sectionColorClasses[catIndex]);
    const textColor = this.shouldUseWhiteText(sectionColorClasses[catIndex]) ? 'FFFFFFFF' : 'FF000000';

    // Encabezado de categoría (solo color de texto, fondo blanco)
    const headerCell = worksheet.getCell(filaInicioCategorias, catIndex + 1);
    headerCell.value = categoria.nombre;
    headerCell.font = { 
      bold: true,
      color: { argb: this.mapColorClassToExcelColor(sectionColorClasses[catIndex]) }
    };
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' } // Fondo blanco
    };
    
    // Choferes de esta categoría (fondo color categoría + texto blanco/negro según corresponda)
    categoria.choferes.forEach((chofer, choferIndex) => {
      const cell = worksheet.getCell(filaInicioCategorias + 1 + choferIndex, catIndex + 1);
      
      // Usamos el helper para choferes asignados (con metadata)
      if ('observaciones' in chofer && 'hojaDeRuta' in chofer) {
        this.setCellWithMetadata(
          cell, 
          chofer as ChoferAsignado, 
          workbook,
          catIndex,  // Usamos el índice de la categoría actual
          sectionColorClasses
        );
      } else {
        cell.value = chofer.apellido + " " + chofer.nombre;
        // Mantener estilos existentes para choferes no asignados
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.font = {
          color: { argb: textColor }
        };
      }
      
      // Mantén el código existente de colores
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.font = {
        color: { argb: textColor }
      };
    });
  });

    // 7. Choferes inactivos (banco de suplentes)
    const columnaInicioInactivos = choferesAgrupadosPorCategoria.length + 2;
    
    // Título
    worksheet.getCell(filaInicioCategorias, columnaInicioInactivos).value = 'Banco de suplentes';
    worksheet.getCell(filaInicioCategorias, columnaInicioInactivos).font = { bold: true, color: { argb: 'FFFFC107' } };
    
    // Listado de choferes inactivos
    choferesInactivos.forEach((chofer, index) => {
      worksheet.getCell(filaInicioCategorias + 1 + index, columnaInicioInactivos).value = chofer.apellido + " " + chofer.nombre;
    });

    // Ajustar anchos de columnas
worksheet.columns.forEach(column => {
  if (!column.values) return;
  
  const maxLength = column.values.reduce((acc: number, cellValue: ExcelJS.CellValue) => {
    if (cellValue === null || cellValue === undefined) return acc;
    
    let strValue: string;
    
    try {
      // Intenta convertir cualquier tipo de valor a string
      strValue = cellValue.toString();
    } catch (e) {
      // Si falla, usa un valor por defecto
      strValue = '';
    }
    
    return Math.max(acc, strValue.length);
  }, 0);
  
  column.width = Math.min(Math.max(maxLength + 2, 10), 30);
});
this.agregarHojaMetadata(workbook, metadata);
    // Generar el archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Asignaciones_${fechaSeleccionada.replace(/\//g, '-')}.xlsx`);
    
  }

  // Método auxiliar para mapear clases de color a colores de Excel
  private mapColorClassToExcelColor(colorClass: string): string {
    const colorMap: Record<string, string> = {
      'bg-primary': 'FF007BFF',   // Azul
      'bg-success': 'FF28A745',   // Verde
      'bg-warning': 'FFFFC107',   // Amarillo
      'bg-info': 'FF17A2B8',      // Cyan
      'bg-danger': 'FFDC3545',    // Rojo
      'bg-secondary': 'FF6C757D', // Gris
      'bg-dark': 'FF343A40'       // Negro
    };
    
    const foundKey = Object.keys(colorMap).find(key => colorClass.includes(key));
    return foundKey ? colorMap[foundKey] : 'FFFFFFFF'; // Blanco por defecto
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
      'bg-dark', 'bg-secondary', 'bg-danger', 'bg-primary'
    ];
    return categoriasTextoBlanco.some(cat => colorClass.includes(cat));
  }

  private setCellWithMetadata(
    cell: ExcelJS.Cell,
    chofer: ChoferAsignado,
    workbook: ExcelJS.Workbook,
    categoriaIndex: number,  // Nuevo parámetro
    sectionColorClasses: string[]  // Nuevo parámetro
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
      celda: cell.address
    });
    
    // 4. Aplicar estilos de categoría (manteniendo los colores originales)
    if (categoriaIndex >= 0 && categoriaIndex < sectionColorClasses.length) {
      const bgColor = this.mapColorClassToExcelColor(sectionColorClasses[categoriaIndex]);
      const textColor = this.shouldUseWhiteText(sectionColorClasses[categoriaIndex]) ? 'FFFFFFFF' : 'FF000000';
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.font = {
        color: { argb: textColor },
        italic: true  // Estilo adicional para celdas con metadata
      };
    }
    
    // 5. Bordes consistentes
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  private agregarMetadata(workbook: ExcelJS.Workbook, data: {
    id: string;
    observaciones: string;
    hojaDeRuta: string;
    celda: string;
  }) {
    let sheet = workbook.getWorksheet('_metadata');
    
    if (!sheet) {
      sheet = workbook.addWorksheet('_metadata', { state: 'veryHidden' });
      sheet.addRow(['ID', 'Observaciones', 'Hoja de Ruta', 'Celda']);
    }
    
    sheet.addRow([data.id, data.observaciones, data.hojaDeRuta, data.celda]);
  }


  // Actualizar el método leerMetadataExcel:
  async leerMetadataExcel(file: File): Promise<Partial<ChoferAsignado>[]> {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const choferes: Partial<ChoferAsignado>[] = [];
    const metaSheet = workbook.getWorksheet('_metadata');

    if (!metaSheet) return choferes;

    metaSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezados
      
      choferes.push({
        idChofer: Number(row.getCell(1).value),
        observaciones: row.getCell(2).value?.toString(),
        hojaDeRuta: row.getCell(3).value?.toString()
        // Nota: Esto devuelve Partial<ChoferAsignado>
      });
    });

    return choferes;
  }

  private agregarHojaMetadata(workbook: ExcelJS.Workbook, datos: MetadataChofer[]) {
    // Eliminar hoja existente si hay
    const existingSheet = workbook.getWorksheet('_metadata');
    if (existingSheet) {
      workbook.removeWorksheet(existingSheet.id);
    }

    const sheet = workbook.addWorksheet('_metadata', {
      state: 'hidden',
      properties: { tabColor: { argb: 'FFFF0000' } } // Rojo para identificar fácil
    });

    // Encabezados
    const headerRow = sheet.addRow(['ID', 'Observaciones', 'Hoja de Ruta', 'Celda']);
    headerRow.font = { bold: true };

    // Datos
    datos.forEach(chofer => {
      sheet.addRow([
        chofer.id,
        chofer.observaciones,
        chofer.hojaDeRuta,
        chofer.celda
      ]);
    });

    // Ocultar completamente
    sheet.state = 'veryHidden'; // Más oculto que 'hidden'
  }

}
