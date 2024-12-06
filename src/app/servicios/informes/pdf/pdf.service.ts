import { Injectable } from '@angular/core';
import { FacturaCliente } from 'src/app/interfaces/factura-cliente';
import { FacturaOpCliente } from 'src/app/interfaces/factura-op-cliente';
/* import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts'; */
import { Alignment } from 'pdfmake/interfaces';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { StorageService } from '../../storage/storage.service';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  $choferes!:Chofer[]; 
  constructor(private storageService:StorageService) { }

// Reportes PDF para los clientes
async exportToPdfCliente(
  factura: FacturaCliente,
  facturasOp: FacturaOp[],
  choferes: Chofer[],
  
): Promise<void> {
  const doc = new jsPDF();

  // Logo en la parte superior izquierda
  const logoBase64 = 'data:image/png;base64,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'; // Aquí va tu imagen codificada en base64
  doc.addImage(logoBase64, 'PNG', 10, 10, 40, 10); // Posición (10, 10) y tamaño (40x20)

  // Título principal
  doc.setFontSize(12); // Tamaño de fuente del título
  doc.setFont('helvetica', 'bold');
  doc.text(`Liquidación de Servicios ${factura.razonSocial}`, 10, 30); // Posición (60, 15)

  // Subtítulo: Año y Mes
  doc.setFontSize(11); // Tamaño de fuente del subtítulo
  doc.setFont('helvetica', 'normal');
  const fechaFactura = new Date(factura.fecha);
  const mes = fechaFactura.toLocaleString('default', { month: 'long' });
  const anio = fechaFactura.getFullYear();
  doc.text(`Año: ${anio}  Mes: ${mes}`, 10, 35); // Posición (60, 25)

  // ID de la factura
  doc.setFontSize(8); // Tamaño de fuente del subtítulo
  doc.text(`ID: ${factura.idFacturaCliente}`, 10, 40); // Posición (60, 35)

  // Espaciado antes de la tabla
  doc.setFontSize(10); // Tamaño de fuente estándar para la tabla

  // Encabezados de las columnas seleccionadas
  const encabezado = factura.columnas;

  // Datos para cada fila, filtrando según las columnas seleccionadas
  const filas = facturasOp.map(fila =>
    encabezado.map(columna => {
      const valor = this.obtenerDatosCliente(factura, fila, choferes, columna);
      return valor !== undefined && valor !== null ? valor.toString() : '-';
    })
  );


  // Configuración de la tabla usando autoTable
  autoTable(doc, {
    head: [encabezado],
    body: filas,
    styles: { fontSize: factura.columnas.length <= 9 ? 8 : 7, cellPadding: factura.columnas.length <= 9 ? 3 : 2, lineWidth: 0.4, lineColor: [0, 0, 0],},
    theme: 'grid',
    headStyles: { 
      fillColor: '#6495ED',
      textColor: 'black',
      fontStyle: 'bold',      
      },
    bodyStyles: { 
      fillColor: '#ADD8E6',
      textColor: 'black',
      },
    margin: { top: 45 }, // Desplazar la tabla hacia abajo
    foot: [
      [
        {
          content: 'Total',
          colSpan: factura.columnas.length - 1, // Combina todas las columnas excepto la última
          styles: { halign: 'left', fontStyle: 'bold' }, // Alineación a la izquierda y negrita
        },
        {
          content: this.formatearValor(factura.valores.total),
          styles: { halign: 'right', fontStyle: 'bold' }, // Alineación a la derecha y negrita
        },
      ],
    ],
    footStyles: {
      fillColor: '#6495ED',
      textColor: 'black',
      fontStyle: 'bold',
      halign: 'center',      
    },
    
    columnStyles: {
      0: { halign: 'center' }, // Alinear "Total" a la izquierda
      [factura.columnas.length - 1]: { halign: 'center' } // Alinear el valor total a la derecha
    }
  });

  doc.save(`Factura ${factura.razonSocial} - ${factura.fecha}.pdf`);
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

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   //////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return `$${nuevoValor}`  
 }

 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }

  obtenerDatosCliente(factura: any, facturaOp: any, choferes: Chofer[], columna: any){
      ////console.log("factura: ", factura, "facOp:", facturaOp, "choferes: ", choferes, "columna", columna);
      
      switch (columna) {
        case 'Fecha':{
          //console.log("1)Fecha: ", facturaOp.fecha);
          return facturaOp.fecha;
        };
        case 'Quincena':{
          //console.log("2)Quincena: ", this.getQuincena(facturaOp.fecha));
          return this.getQuincena(facturaOp.fecha);
        };        
        case 'Chofer':{
          //console.log("3)Chofer: ", this.getChofer(facturaOp.idChofer, choferes));
          return this.getChofer(facturaOp.idChofer, choferes);
        };
        case 'Patente':{
          //console.log("3)Patente: ", facturaOp.patente);
          return facturaOp.patente;
        };
        case 'Concepto':{
          //console.log("4)Concepto Cliente: ", facturaOp.observaciones);
          return facturaOp.observaciones;
        };
        case 'Hoja de Ruta':{
          //console.log("5)Hoja de ruta: ", facturaOp.hojaRuta);
          return facturaOp.hojaRuta;
        };
        case "Km":{
          //console.log("6)Km: ", facturaOp.km);
          return facturaOp.km;
        };
        case "Jornada":{
          //console.log("7)Jornada: ", facturaOp.valores.tarifaBase);
          return this.formatearValor(facturaOp.valores.tarifaBase);
        };
        case "Ad Km":{
          //console.log("8)Ad Km: ", this.formatearValor(facturaOp.valores.kmMonto));
          return this.formatearValor(facturaOp.valores.kmMonto);
        };
        case "Acomp":{
          //console.log("9)Acomp: ", this.formatearValor(facturaOp.valores.acompaniante));
          return this.formatearValor(facturaOp.valores.acompaniante);
        };
        case "A Cobrar":{
          //console.log("9)A Cobrar: ", this.formatearValor(facturaOp.valores.total));
          return this.formatearValor(facturaOp.valores.total);
        };
        default:{
          return ''
        }
      }    
  }

  
// Reportes PDF para los choferes
async exportToPdfChofer(factura: FacturaChofer, facturasOp: FacturaOp[], clientes: Cliente[]): Promise<void> {
  const quincena = this.getQuincena(factura.fecha);
  //////console.log()(pdfMake.vfs);
  const imageContent = {
    image: 'data:image/png;base64,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', // Aquí va tu imagen codificada en base64
    fit: [100, 50], // Utiliza 'fit' para especificar el tamaño de la imagen
    alignment: 'left' as const // Asegurando que la alineación sea del tipo correcto
  };
  // Filas estáticas con encabezados y total
  const headerRowFillColor = '#6495ED'; // Azul medio
  const totalRowFillColor = '#6495ED'; // Azul medio

  // Filas dinámicas
  const dynamicRowFillColor = '#ADD8E6'; // Azul claro
  const docDefinition = {
    content: [
      imageContent,
      { text: `Liquidacion de Servicios ${factura.apellido} ${factura.nombre}`, style: 'header' },
      { text: `Año:${new Date(factura.fecha).getFullYear()} Mes:${new Date(factura.fecha).toLocaleString('default', { month: 'long' })} `, style: 'headerSub' },
      { text: `Id ${factura.idFacturaChofer}`, style: 'headerId' },
      {
        table: {
          //widths: [50, 45 ,'*', 120, 60 , 55 , 75],
          widths: [50, 45 , '*', 20, 70, 55, 50, '*'],          
          body: [
            // Fila estática con encabezados
            [{ text: 'Fecha', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Quincena', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
          /*    { text: 'Mes', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Año', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },  */
             /* { text: 'Id Operación', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },  */
             { text: 'Cliente', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Km', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Jornada', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Adic Km', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Acomp', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'A cobrar', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }],
            // Filas dinámicas
            ...facturasOp.map(facOp => [
              { text: facOp.fecha, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: this.getQuincena(facOp.fecha), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
             /*  { text: `${new Date(facOp.fecha).getMonth() + 1}`, fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: `${new Date(facOp.fecha).getFullYear()}`, fillColor: dynamicRowFillColor, alignment: 'center' },  */
              { text: this.getCliente(facOp.idCliente, clientes), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: facOp.km, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: this.formatearValor(facOp.valores.tarifaBase), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: this.formatearValor(facOp.valores.kmMonto), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: this.formatearValor(facOp.valores.acompaniante), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: this.formatearValor(facOp.valores.total), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' },               
              ]),
              // Fila estática con el total
              [{ text: 'Total', colSpan: 7, style: 'tableHeader', fillColor: totalRowFillColor}, {}, {}, {}, {}, {}, {}, { text: this.formatearValor(factura.valores.total), style: 'tableHeader', fillColor: totalRowFillColor, alignment: 'center' }]
          ]
        }
      }
    ],
    styles: {
      header: {
        fontSize: 12,
        bold: true,
        margin: [0, 20, 0, 0]
      },
      headerSub:{
        fontSize: 11,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      headerId:{
        fontSize: 8,
        bold: false,
        margin: [0, 0, 0, 5]
      },
      body:{
        bold: false,
        fontSize: 9,
        //color: 'black',
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'black',
      }
    }
  };

  pdfMake.createPdf(docDefinition).download(`Factura ${factura.apellido} ${factura.nombre}-${factura.fecha}.pdf`);
}

//////////////////// Reportes PDF para los proveedores
async exportToPdfProveedor(factura: FacturaProveedor, facturasOp: FacturaOp[], clientes: Cliente [], choferes: Chofer[]): Promise<void> {
  const quincena = this.getQuincena(factura.fecha);
  //////console.log()(pdfMake.vfs);
  const imageContent = {
    image: 'data:image/png;base64,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', // Aquí va tu imagen codificada en base64
    fit: [100, 50], // Utiliza 'fit' para especificar el tamaño de la imagen
    alignment: 'left' as const // Asegurando que la alineación sea del tipo correcto
  };
  // Filas estáticas con encabezados y total
  const headerRowFillColor = '#6495ED'; // Azul medio
  const totalRowFillColor = '#6495ED'; // Azul medio

  // Filas dinámicas
  const dynamicRowFillColor = '#ADD8E6'; // Azul claro
  const docDefinition = {
    content: [
      imageContent,
      { text: `Liquidacion de Servicios ${factura.razonSocial}`, style: 'header' },
      { text: `Año:${new Date(factura.fecha).getFullYear()} Mes:${new Date(factura.fecha).toLocaleString('default', { month: 'long' })} `, style: 'headerSub' },
      { text: `Id ${factura.idFacturaProveedor}`, style: 'headerId' },
      {
        table: {
          //widths: [50, 45 ,'*', 120, 60 , 55 , 75],
          widths: [ 47, 43 , 60, 60 , 20 , 65 , 50 , 45, '*' ],
          body: [
            // Fila estática con encabezados
            [{ text: 'Fecha', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Quincena', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
          /*    { text: 'Mes', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Año', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },  */             
             { text: 'Chofer', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Cliente', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Km', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },
             { text: 'Jornada', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Adic Km', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
             { text: 'Acomp', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },              
             { text: 'A cobrar', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }],
            // Filas dinámicas
            ...facturasOp.map(facOp => [
              { text: facOp.fecha, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: this.getQuincena(facOp.fecha), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
             /*  { text: `${new Date(facOp.fecha).getMonth() + 1}`, fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: `${new Date(facOp.fecha).getFullYear()}`, fillColor: dynamicRowFillColor, alignment: 'center' },  */              
              { text: this.getChofer(facOp.idChofer, choferes), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: this.getCliente(facOp.idCliente, clientes), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
              { text: facOp.km, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' },
              { text: this.formatearValor(facOp.valores.tarifaBase), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' },
              { text: this.formatearValor(facOp.valores.kmMonto), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' },
              { text: this.formatearValor(facOp.valores.acompaniante), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' },
              { text: this.formatearValor(facOp.valores.total), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }
            ]),
            // Fila estática con el total
            [{ text: 'Total', colSpan: 8, style: 'tableHeader', fillColor: totalRowFillColor}, {}, {}, {}, {}, {}, {},  {}, { text: this.formatearValor(factura.valores.total), style: 'tableHeader', fillColor: totalRowFillColor, alignment: 'center' }]
          ]
        }
      }
    ],
    styles: {
      header: {
        fontSize: 12,
        bold: true,
        margin: [0, 20, 0, 0]
      },
      headerSub:{
        fontSize: 11,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      headerId:{
        fontSize: 8,
        bold: false,
        margin: [0, 0, 0, 5]
      },
      body:{
        bold: false,
        fontSize: 9,
        //color: 'black',
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'black',
      }
    }
  };

  pdfMake.createPdf(docDefinition).download(`Factura ${factura.razonSocial}-${factura.fecha}.pdf`);
}

/////////////////////////////////////////////////////////////////
async prueba(
  factura: FacturaCliente, 
  facturasOp: FacturaOp[], 
  choferes: Chofer[], 
  columnasSeleccionadas: string[]
): Promise<void> {
  const imageContent = {
    image: 'data:image/png;base64,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', // Aquí va tu imagen codificada en base64
    fit: [100, 50], // Utiliza 'fit' para especificar el tamaño de la imagen
    alignment: 'left' as const // Asegurando que la alineación sea del tipo correcto
  };

  const headerRowFillColor = '#6495ED';  // Azul medio para el encabezado
  const dynamicRowFillColor = '#ADD8E6';  // Azul claro para filas dinámicas
  const totalRowFillColor = '#4682B4';    // Azul acero para la fila de total

  // Crear el encabezado dinámicamente según las columnas seleccionadas
  const headerRow = columnasSeleccionadas.map(columna => ({
    text: columna,
    style: 'tableHeader',
    fillColor: headerRowFillColor,
    alignment: 'center'
  }));

  // Crear filas dinámicas según las columnas seleccionadas
  const tableBody = [headerRow];

  facturasOp.forEach(op => {
    const chofer = choferes.find(c => c.id === op.idChofer);

    const rowData = columnasSeleccionadas.map(columna => {
      switch (columna) {
        case 'Fecha':
          return { 
            text: new Date(op.fecha).toLocaleDateString(), 
            alignment: 'center', 
            fillColor: dynamicRowFillColor,
            style: 'tableCell' // Agrega el estilo
          };
        case 'Quincena':
          return { 
            text: this.getQuincena(op.fecha), 
            alignment: 'center', 
            fillColor: dynamicRowFillColor,
            style: 'tableCell' // Agrega el estilo
          };
        case 'Chofer':
          return { 
            text: chofer?.nombre || 'Desconocido', 
            alignment: 'center', 
            fillColor: dynamicRowFillColor,
            style: 'tableCell' // Agrega el estilo
          };
        case 'Concepto':
          return { 
            text: op.observaciones, 
            alignment: 'center', 
            fillColor: dynamicRowFillColor,
            style: 'tableCell' // Agrega el estilo
          };
        case 'Total':
          return { 
            text: `$${op.valores.total.toFixed(2)}`, 
            alignment: 'center', 
            fillColor: dynamicRowFillColor,
            style: 'tableCell' // Agrega el estilo
          };
        default:
          return { 
            text: '-', 
            alignment: 'center', 
            fillColor: dynamicRowFillColor,
            style: 'tableCell' // Agrega el estilo
          };
      }
    });

    tableBody.push(rowData);
  });

  // Agregar fila de total solo si 'Total' es una de las columnas seleccionadas
  if (columnasSeleccionadas.includes('Total')) {
    const totalFactura = facturasOp.reduce((sum, op) => sum + op.valores.total, 0);
    const totalRow = new Array(columnasSeleccionadas.length).fill({ text: '', fillColor: totalRowFillColor });
    totalRow[columnasSeleccionadas.indexOf('Total')] = { 
      text: `$${totalFactura.toFixed(2)}`, 
      alignment: 'center', 
      bold: true, 
      fillColor: totalRowFillColor 
    };
    totalRow[0] = { text: 'Total General', colSpan: columnasSeleccionadas.length - 1, alignment: 'right', bold: true, fillColor: totalRowFillColor };
    tableBody.push(totalRow);
  }

  // Definición del documento PDF
  const docDefinition = {
    content: [
      imageContent,
      { text: `Liquidación de Servicios ${factura.razonSocial}`, style: 'header' },
      { text: `Año: ${new Date(factura.fecha).getFullYear()} - Mes: ${new Date(factura.fecha).toLocaleString('default', { month: 'long' })}`, style: 'headerSub' },
      { text: `ID: ${factura.idFacturaCliente}`, style: 'headerId' },
      {
        table: {
          widths: columnasSeleccionadas.map(() => '*'), // Ancho proporcional según columnas
          body: tableBody
        }
      }
    ],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 10, 0, 10] },
      headerSub: { fontSize: 14, bold: false, margin: [0, 0, 0, 10] },
      headerId: { fontSize: 12, italics: true, margin: [0, 0, 0, 10] },
      tableHeader: { bold: true, fontSize: 12, color: 'white' }
    }
  };

  // Generación del PDF
  pdfMake.createPdf(docDefinition).download(`Liquidacion_${factura.idFacturaCliente}.pdf`);
}



}
