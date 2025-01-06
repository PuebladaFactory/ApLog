import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';



import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  factura!: FacturaChofer|FacturaCliente| FacturaProveedor
  

  constructor() { }

getQuincena(fecha: any): string {
  console.log("fecha: ", fecha);
  
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

  getCategoria(patente:string, idChofer:number, choferes: Chofer[]){
    let veh: Vehiculo[];   
    let choferSel: Chofer[];    
    choferSel = choferes.filter((c:Chofer)=> {return c.idChofer === idChofer});
    veh = choferSel[0].vehiculo.filter((v:Vehiculo)=>{return v.dominio === patente});    
    return veh[0].categoria.nombre;
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   ////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return `$${nuevoValor}`  
 }

 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }

  obtenerDatos(factura: any, facturaOp: FacturaOp, clientes: Cliente[], columna: any, choferes:Chofer[]){      
      
    switch (columna) {
      case 'Fecha':{          
        return facturaOp.fecha;
      };
      case 'Quincena':{          
        return this.getQuincena(facturaOp.fecha);
      };        
      case 'Chofer':{          
        return this.getChofer(facturaOp.idChofer, choferes);
      };
      case 'Cliente':{          
        return this.getCliente(facturaOp.idCliente, clientes);
      };
      case 'Patente':{          
        return facturaOp.patente;
      };
      case 'Concepto':{
        if (factura.hasOwnProperty('idFacturaCliente')) {            
          return facturaOp.observaciones;
        } else if (factura.hasOwnProperty('idFacturaChofer')) {
          return this.getCategoria(facturaOp.patente, facturaOp.idChofer, choferes);
        } else if (factura.hasOwnProperty('idFacturaProveedor')) {
          return this.getCategoria(facturaOp.patente, facturaOp.idChofer, choferes);
        }
        return "";
      };
      case 'Hoja de Ruta':{          
        return facturaOp.hojaRuta;
      };
      case "Km":{          
        return facturaOp.km;
      };
      case "Jornada":{          
        return this.formatearValor(facturaOp.valores.tarifaBase);
      };
      case "Ad Km":{          
        return this.formatearValor(facturaOp.valores.kmMonto);
      };
      case "Acomp":{          
        return this.formatearValor(facturaOp.valores.acompaniante);
      };
      case "A Cobrar":{          
        return this.formatearValor(facturaOp.valores.total);
      };
      default:{
        return ''
      }
    }    
}


// Reportes EXCEL para los clientes
async exportToExcelCliente(
  factura: FacturaCliente,
  facturasOp: FacturaOp[],
  clientes: Cliente[],
  choferes: Chofer[]
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
  titleCell.value = `Liquidación de Servicios ${factura.razonSocial}`;
  titleCell.font = { size: 16, bold: true };

  // Subtítulo
  worksheet.mergeCells('A6:F6');
  const subTitleCell = worksheet.getCell('A6');
  subTitleCell.value = `Año: ${new Date(factura.fecha).getFullYear()} Mes: ${new Date(factura.fecha).toLocaleString('default', { month: 'long' })}`;
  subTitleCell.font = { size: 12, bold: true };

  // Subtítulo adicional
  worksheet.mergeCells('A7:F7');
  const subTitleCell2 = worksheet.getCell('A7');
  subTitleCell2.value = `${factura.idFacturaCliente}`;
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
    const rowData = factura.columnas.map((columna) =>
      this.obtenerDatos(factura, facturaOp, clientes, columna, choferes)
    );
    worksheet.addRow(rowData).eachCell((cell) => {
      cell.font = { size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'top' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
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
    subtotalRow.getCell(factura.columnas.length).value = this.formatearValor(
      factura.valores.totalTarifaBase + factura.valores.totalAcompaniante + factura.valores.totalkmMonto
    );
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
      descuentoRow.getCell(factura.columnas.length).value = `-${this.formatearValor(descuento.valor)}`;
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
  totalRow.getCell(factura.columnas.length).value = this.formatearValor(factura.valores.total);
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
  FileSaver.saveAs(new Blob([buffer]), `Factura_${factura.razonSocial}_${factura.fecha}.xlsx`);
}


// Reportes EXCEL para los choferes
async exportToExcelChofer(factura: FacturaChofer, facturasOp: FacturaOp[], clientes:Cliente[], choferes: Chofer[]): Promise<void> {  

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Factura');

  // Logo
  const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMoAAAA+CAMAAABduHSVAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAABmUExURQAAAM8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJQ8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Uds8FJc8FJQ8Udv///1uXIdgAAAAfdFJOUwBAoGAgEPDQkLBw4MBAMPAQgNBggHAgwJBQ4FCwoDDMVBr9AAAAAWJLR0QhxGwNFgAAAAlwSFlzAAALEQAACxIBVEkMUgAAAAd0SU1FB+gFHAEwF7m7jRsAAAABb3JOVAHPoneaAAAAtGVYSWZJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAAC8ZAQDoAwAALxkBAOgDAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgAwABAAAAygAAAAOgAwABAAAAPgAAAAAAAABQJCBZAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI0LTA1LTI4VDAxOjQ4OjIyKzAwOjAwYrqLZwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNC0wNS0yOFQwMTo0ODoyMiswMDowMBPnM9sAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjQtMDUtMjhUMDE6NDg6MjMrMDA6MDDihRmwAAAAF3RFWHRleGlmOkNvbG9yU3BhY2UANjU1MzUsILj4LMsAAAAgdEVYdGV4aWY6Q29tcG9uZW50c0NvbmZpZ3VyYXRpb24ALi4uavKhZAAAABV0RVh0ZXhpZjpFeGlmT2Zmc2V0ADEwMiwg4HKYmQAAABV0RVh0ZXhpZjpFeGlmVmVyc2lvbgAwMjEwuHZWeAAAABl0RVh0ZXhpZjpGbGFzaFBpeFZlcnNpb24AMDEwMBLUKKwAAAAadEVYdGV4aWY6UGl4ZWxYRGltZW5zaW9uADIwMiwgoS3lbwAAABl0RVh0ZXhpZjpQaXhlbFlEaW1lbnNpb24ANjIsIBv2ioIAAAAZdEVYdGV4aWY6WUNiQ3JQb3NpdGlvbmluZwAxLCDg7k7SAAAGEElEQVRo3u1aaZeqOBANbvgUEVBBUYH//yuHVKWSqiS03Z4+wzjn3Q9tAlnq1paFVuovPhHJYrmaW4ZfwnrT9+k2mVuMX8GiB/zZfb5xVj1hv/h0Npnl0n+6ny3/D1QO+LO3VOYW6G3kxwJ+y8+nUg0n+LWBn80t0bs4D0OFpcWHU8mHETkUE0OlnFumN1FpKhcs7z+aylkzMQ5G+fgzc3E9OP/CjdjHUmk0k7Otbj83F1+4eynKx3NL9Q7qI3cvjczl4mJu6X4EcK8rf3JzVI75O0POBHCvtsCK24htsTQc67kFjKM4aIhH6F7m2b3F35KWlcMYRIVorweoVX6Iwc7gozAdhYlz86D+sgvXZG2nGScKwkI9mHuNr3Ejtu77G1HhCQEfjI3AKX1UZOMAenaZJUe044NGmUUtQGG2IBfGHaQ3IqqnLj/ZeHfuXk8cW+mNGC4rF7/9ASWLzj4t16i8IqBCD6JqGdxchBM8P96JGNScyxTcvaArGjTp1/CLkjEuZ2wTnf1KRv6GXGZdnqRiLZx7TJxLVcxEvnu1rJKy97wDUEG5AkzKdSTzcyqW29cWpuZPZMiCA7i1wr3ISFc77YgOf0gyy+UB3W1wa81UVNEG1VZuePhWXK5CeZIQlacf9bmZ6yiZ8AEU9yh0rzvTkrAAteZ2bQYbTxqtrEaCW4/wIEXxF6TzQzCpCuYqKjSVYIJDPhnVB3evmGSCy9H1iEleB1S451WBICoSREILDWPy9N7jLriwdpDuJQLNZImW21aKGkgeD26dUCtfS8TNJJIIaHCThK9Bg4YGRzvcmdDHxiOPkj0cFy/VB5JDAFSNQ8UjQggjgijGBLTQjmOI5UT5s7VkhwcbeLj4uRrTIbNvLNVzKiCXM7DBYWpZuRrVtioCkSaP0WgysS7c62yixMvVRmOOi0z1oUYh+ky6cSC57qyl5eYlEk/nhCgTnP+B7nXi7lWTg9imlA7tlsGT/elTaZhGBJX4snJXQSLx5LRWKWJNMPAfPFvZWwpvk2Y1Rlx4qo9p1CRnY8YB4+WqIsuK5RZ4ntAThZu/q2W6HsgO3L2UzNVcY2bb4K0jQVoiuXC/zUSMLytFuGeM6MksKrE2d6Jy4WaqWZk0wMRxnustKzwtueSce2nnjWXFqm1iWbGNGE9xS9H4HOmFjWWn6iAtMbkONnlJFfvcvEQSsXDExp5xrXvJWwq+SZMaIy7essLTEk/OcicLqpvcm8UOcVyP+eTSUgj38o5jbJMmlw2KZecNQVoSCe7MU88Qw/dPBQd/aovnlHspEfhe6jVc3HhBWpLJme1m3zgVSD0GpxXuGXnMvZRIAv6ygXb2WPNxvYhobEjGqdCyEiCyoRE25mjJDvXEaf8ckcxwkaKKtOQlZ5d64ufkyYNX7FQQO7GALUgCfowks9i7EboTcTgJUYP3/q1KQbcnX9+qBKjN4Ad/cHkDg3OYCcUtxXdwii9V80PcUnwP1/NPWv97iLjXS/w3byt/7F6/iuQX/13jDfdSq07WuxfyTMu7Nheg/sjJ+g0qwVXlN1B6H46zF58spz9prkopM438zuc2cYwctTEiUtK66kBh8NfoLqE2aJW1aYglbghDZWUf29Ia5+jGOnAqUxwRa7qZK3ldA/BbCvO5fhGWtK52/UrfvS6t7hb2uxhYZZ3q6pJKG+aESKXb0GNXSqA/fMNNtcylGRGsAs1cyesaoBr42UN7LipKz47zWO/YjwSy1LmBcwKgAq3hDdw1dwEVeAdNy150UtmWDCEczPmx61Cmaio2T2JLsyTFKvcfLpbKrU8SFP8FFbBKyoLgFRVQ9cKN/AWVYGyHMYGxs4b2zRIJLCgQXMxm2R4Hf0XlNnZN//yAip5LSD9JBcInjaeRJ7/oWOxHcRdUyjJJJen7FaPimhh9pVm20SZdbTJTssNuQff6cUel3lFZjvUUVH3rM6emm26WuQ43MUiIWizcu7Lc2VKJynR5cWfES5ayyRKarMcarhKdLYmO+nFnG+xByain21hfUwkmXdFjLHVi7DiTeZCM8mx2c0vxK1iOXrKdW4i/+Iuv8Q9m4j23gepttQAAAABJRU5ErkJggg=='; // Logo en formato base64
  const imageId = workbook.addImage({
    base64: logoBase64,
    extension: 'png',
  });
  worksheet.addImage(imageId, 'A1:B3');

  // Título
  worksheet.mergeCells('A5:F5');
  const titleCell = worksheet.getCell('A5');
  titleCell.value = `Liquidación de Servicios ${factura.apellido} ${factura.nombre} `;
  titleCell.font = { size: 16, bold: true };

  // Subtítulo
  worksheet.mergeCells('A6:F6');
  const subTitleCell = worksheet.getCell('A6');
  subTitleCell.value = `Año: ${new Date(factura.fecha).getFullYear()} Mes: ${new Date(factura.fecha).toLocaleString('default', { month: 'long' })}`;
  subTitleCell.font = { size: 12, bold: true };

  // Subtítulo adicional
  worksheet.mergeCells('A7:F7');
  const subTitleCell2 = worksheet.getCell('A7');
  subTitleCell2.value = `${factura.idFacturaChofer}`;
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
    const rowData = factura.columnas.map((columna) =>
      this.obtenerDatos(factura, facturaOp, clientes, columna, choferes)
    );
    worksheet.addRow(rowData).eachCell((cell) => {
      cell.font = { size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'top' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
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
    subtotalRow.getCell(factura.columnas.length).value = this.formatearValor(
      factura.valores.totalTarifaBase + factura.valores.totalAcompaniante + factura.valores.totalkmMonto
    );
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
      descuentoRow.getCell(factura.columnas.length).value = `-${this.formatearValor(descuento.valor)}`;
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
  totalRow.getCell(factura.columnas.length).value = this.formatearValor(factura.valores.total);
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
    FileSaver.saveAs(new Blob([buffer]), `Factura_${factura.apellido}${factura.nombre}_${factura.fecha}.xlsx`);

}



////////////// Reportes EXCEL para los proveedores
async exportToExcelProveedor(factura: FacturaProveedor, facturasOp: FacturaOp[], clientes: Cliente[], choferes: Chofer[]): Promise<void> {
  
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
  titleCell.value = `Liquidación de Servicios ${factura.razonSocial}`;
  titleCell.font = { size: 16, bold: true };

  // Subtítulo
  worksheet.mergeCells('A6:F6');
  const subTitleCell = worksheet.getCell('A6');
  subTitleCell.value = `Año: ${new Date(factura.fecha).getFullYear()} Mes: ${new Date(factura.fecha).toLocaleString('default', { month: 'long' })}`;
  subTitleCell.font = { size: 12, bold: true };

  // Subtítulo adicional
  worksheet.mergeCells('A7:F7');
  const subTitleCell2 = worksheet.getCell('A7');
  subTitleCell2.value = `${factura.idFacturaProveedor}`;
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
    const rowData = factura.columnas.map((columna) =>
      this.obtenerDatos(factura, facturaOp, clientes, columna, choferes)
    );
    worksheet.addRow(rowData).eachCell((cell) => {
      cell.font = { size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'top' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFADD8E6' } };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
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
    subtotalRow.getCell(factura.columnas.length).value = this.formatearValor(
      factura.valores.totalTarifaBase + factura.valores.totalAcompaniante + factura.valores.totalkmMonto
    );
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
      descuentoRow.getCell(factura.columnas.length).value = `-${this.formatearValor(descuento.valor)}`;
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
  totalRow.getCell(factura.columnas.length).value = this.formatearValor(factura.valores.total);
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
  FileSaver.saveAs(new Blob([buffer]), `Factura_${factura.razonSocial}_${factura.fecha}.xlsx`);

}

}
