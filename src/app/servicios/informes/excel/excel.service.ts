import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  factura!: FacturaChofer|FacturaCliente| FacturaProveedor
  facturaOp!: FacturaOpChofer| FacturaOpCliente | FacturaOpProveedor

  constructor() { }

  getQuincena(fecha: string | Date): string {
    // Convierte la fecha a objeto Date
    const fechaObj = new Date(fecha);
    // Obtiene el día del mes
    const dia = fechaObj.getDate();
    // Determina si la fecha está en la primera o segunda quincena
    if (dia <= 15) {
      return '1ra';
    } else {
      return '2da';
    }
  }


 //EXCEL CLIENTE
  async exportToExcelCliente(factura: FacturaCliente, facturasOp: FacturaOpCliente[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factura');

    // Añadir un logo
    // Añadir un logo (conversión base64 de tu imagen)
    const logoBase64 = ' data:image/png;base64,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'; // Aquí debes insertar el base64 de tu imagen
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    worksheet.addImage(imageId, 'A1:B3');
    /* const imageId = workbook.addImage({
      base64: 'data:image/png;base64,...',  // Aquí debes insertar el base64 de tu imagen
      extension: 'png',
    });
    worksheet.addImage(imageId, 'A1:B3'); */

    // Título
    worksheet.mergeCells('A4:F4');
    const titleCell = worksheet.getCell('A4');
    titleCell.value =  `Liquidacion de Servicios ${factura.razonSocial} `;
    titleCell.font = { size: 14, bold: true };
    //titleCell.alignment = { horizontal: 'center' };
    //titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC' } };

    //subtitulo
    worksheet.mergeCells('A5:F5');
    const subTitleCell = worksheet.getCell('A5');
    subTitleCell.value =  `${factura.idFacturaCliente} `;
    subTitleCell.font = { size: 8, bold: false };

    
    // Encabezados
    //const headers = ['Fecha', 'Quincena', 'Mes', 'Año', 'Concepto Cliente', 'A cobrar'];
    const headers = ['Fecha', 'Quincena', 'Id Operacion', 'Concepto Cliente', 'A cobrar'];
    worksheet.addRow(headers).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    let quincena = this.getQuincena(factura.fecha)
    // Datos de la factura
    facturasOp.forEach((facOp:FacturaOpCliente) => {
      /* const facturaData = [facOp.fecha, quincena, `${new Date(facOp.fecha).getMonth()+1}`, `${new Date(facOp.fecha).getFullYear()}`, facOp.operacion.observaciones , facOp.total.toFixed(2)]; */
      const facturaData = [facOp.fecha, quincena, facOp.operacion.idOperacion, facOp.operacion.observaciones , facOp.total.toFixed(2)];
      worksheet.addRow(facturaData).eachCell(cell => {
        cell.alignment = { horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });  
    });
    const facturaData = ["Total", "", "", "", factura.total.toFixed(2)];
      worksheet.addRow(facturaData).eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      }); 
    /* const facturaData = [factura.fecha, quincena, `${new Date(factura.fecha).getMonth()+1}`, `${new Date(factura.fecha).getFullYear()}`, factura.razonSocial, 'Cliente X', 'Operación', factura.total.toFixed(2)];
    worksheet.addRow(facturaData).eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }); */
    

    // Ajustar ancho de columnas
    worksheet.columns = [
      /* { width: 15 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 40 },
      { width: 20 }, */
      
      { width: 12 },
      { width: 10 },
      { width: 15 },      
      { width: 40 },
      { width: 18 },

    ];

    // Guardar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]),`Factura${factura.razonSocial}${factura.fecha}.xlsx` );
  }

  /* XLSX.writeFile(wb, `Factura${this.facturaCliente.razonSocial}${this.facturaCliente.fecha}.xlsx`); */
/* 

//EXCEL CHOFER
  async exportToExcelChofer(factura: FacturaChofer): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factura');

    // Añadir un logo
    const imageId = workbook.addImage({
      base64: 'data:image/png;base64,...',  // Aquí debes insertar el base64 de tu imagen
      extension: 'png',
    });
    worksheet.addImage(imageId, 'A1:B3');

    // Título
    worksheet.mergeCells('A4:H4');
    const titleCell = worksheet.getCell('A4');
    titleCell.value = 'Factura Cliente';
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC' } };

    // Encabezados
    const headers = ['Fecha', 'Quincena', 'Mes', 'Año', 'Razón Social', 'Cliente', 'Concepto', 'A cobrar'];
    worksheet.addRow(headers).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Datos de la factura
    const facturaData = [factura.fecha, '1ra', '12', '2023', factura.razonSocial, 'Cliente X', 'Operación', factura.total.toFixed(2)];
    worksheet.addRow(facturaData).eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Ajustar ancho de columnas
    worksheet.columns = [
      { width: 20 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 30 },
      { width: 20 },
      { width: 30 },
      { width: 15 }
    ];

    // Guardar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), 'Factura.xlsx');
  } */

  /* XLSX.writeFile(wb, `Factura${this.facturaCliente.razonSocial}${this.facturaCliente.fecha}.xlsx`); */

}
