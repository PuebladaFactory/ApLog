import { Injectable } from '@angular/core';
import { Descuento, FacturaCliente } from 'src/app/interfaces/factura-cliente';

/* import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts'; */
import { Alignment } from 'pdfmake/interfaces';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';

import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';

import { FacturaOp } from 'src/app/interfaces/factura-op';
import { StorageService } from '../../storage/storage.service';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
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
  clientes: Cliente[],
  choferes: Chofer[]
): Promise<void> {
  const doc = new jsPDF();

  // Logo en la parte superior izquierda
  const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMoAAAA+CAMAAABduHSVAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAABmUExURQAAAM8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJQ8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Uds8FJc8FJQ8Udv///1uXIdgAAAAfdFJOUwBAoGAgEPDQkLBw4MBAMPAQgNBggHAgwJBQ4FCwoDDMVBr9AAAAAWJLR0QhxGwNFgAAAAlwSFlzAAALEQAACxIBVEkMUgAAAAd0SU1FB+gFHAEwF7m7jRsAAAABb3JOVAHPoneaAAAAtGVYSWZJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAAC8ZAQDoAwAALxkBAOgDAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgAwABAAAAygAAAAOgAwABAAAAPgAAAAAAAABQJCBZAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI0LTA1LTI4VDAxOjQ4OjIyKzAwOjAwYrqLZwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNC0wNS0yOFQwMTo0ODoyMiswMDowMBPnM9sAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjQtMDUtMjhUMDE6NDg6MjMrMDA6MDDihRmwAAAAF3RFWHRleGlmOkNvbG9yU3BhY2UANjU1MzUsILj4LMsAAAAgdEVYdGV4aWY6Q29tcG9uZW50c0NvbmZpZ3VyYXRpb24ALi4uavKhZAAAABV0RVh0ZXhpZjpFeGlmT2Zmc2V0ADEwMiwg4HKYmQAAABV0RVh0ZXhpZjpFeGlmVmVyc2lvbgAwMjEwuHZWeAAAABl0RVh0ZXhpZjpGbGFzaFBpeFZlcnNpb24AMDEwMBLUKKwAAAAadEVYdGV4aWY6UGl4ZWxYRGltZW5zaW9uADIwMiwgoS3lbwAAABl0RVh0ZXhpZjpQaXhlbFlEaW1lbnNpb24ANjIsIBv2ioIAAAAZdEVYdGV4aWY6WUNiQ3JQb3NpdGlvbmluZwAxLCDg7k7SAAAGEElEQVRo3u1aaZeqOBANbvgUEVBBUYH//yuHVKWSqiS03Z4+wzjn3Q9tAlnq1paFVuovPhHJYrmaW4ZfwnrT9+k2mVuMX8GiB/zZfb5xVj1hv/h0Npnl0n+6ny3/D1QO+LO3VOYW6G3kxwJ+y8+nUg0n+LWBn80t0bs4D0OFpcWHU8mHETkUE0OlnFumN1FpKhcs7z+aylkzMQ5G+fgzc3E9OP/CjdjHUmk0k7Otbj83F1+4eynKx3NL9Q7qI3cvjczl4mJu6X4EcK8rf3JzVI75O0POBHCvtsCK24htsTQc67kFjKM4aIhH6F7m2b3F35KWlcMYRIVorweoVX6Iwc7gozAdhYlz86D+sgvXZG2nGScKwkI9mHuNr3Ejtu77G1HhCQEfjI3AKX1UZOMAenaZJUe044NGmUUtQGG2IBfGHaQ3IqqnLj/ZeHfuXk8cW+mNGC4rF7/9ASWLzj4t16i8IqBCD6JqGdxchBM8P96JGNScyxTcvaArGjTp1/CLkjEuZ2wTnf1KRv6GXGZdnqRiLZx7TJxLVcxEvnu1rJKy97wDUEG5AkzKdSTzcyqW29cWpuZPZMiCA7i1wr3ISFc77YgOf0gyy+UB3W1wa81UVNEG1VZuePhWXK5CeZIQlacf9bmZ6yiZ8AEU9yh0rzvTkrAAteZ2bQYbTxqtrEaCW4/wIEXxF6TzQzCpCuYqKjSVYIJDPhnVB3evmGSCy9H1iEleB1S451WBICoSREILDWPy9N7jLriwdpDuJQLNZImW21aKGkgeD26dUCtfS8TNJJIIaHCThK9Bg4YGRzvcmdDHxiOPkj0cFy/VB5JDAFSNQ8UjQggjgijGBLTQjmOI5UT5s7VkhwcbeLj4uRrTIbNvLNVzKiCXM7DBYWpZuRrVtioCkSaP0WgysS7c62yixMvVRmOOi0z1oUYh+ky6cSC57qyl5eYlEk/nhCgTnP+B7nXi7lWTg9imlA7tlsGT/elTaZhGBJX4snJXQSLx5LRWKWJNMPAfPFvZWwpvk2Y1Rlx4qo9p1CRnY8YB4+WqIsuK5RZ4ntAThZu/q2W6HsgO3L2UzNVcY2bb4K0jQVoiuXC/zUSMLytFuGeM6MksKrE2d6Jy4WaqWZk0wMRxnustKzwtueSce2nnjWXFqm1iWbGNGE9xS9H4HOmFjWWn6iAtMbkONnlJFfvcvEQSsXDExp5xrXvJWwq+SZMaIy7essLTEk/OcicLqpvcm8UOcVyP+eTSUgj38o5jbJMmlw2KZecNQVoSCe7MU88Qw/dPBQd/aovnlHspEfhe6jVc3HhBWpLJme1m3zgVSD0GpxXuGXnMvZRIAv6ygXb2WPNxvYhobEjGqdCyEiCyoRE25mjJDvXEaf8ckcxwkaKKtOQlZ5d64ufkyYNX7FQQO7GALUgCfowks9i7EboTcTgJUYP3/q1KQbcnX9+qBKjN4Ad/cHkDg3OYCcUtxXdwii9V80PcUnwP1/NPWv97iLjXS/w3byt/7F6/iuQX/13jDfdSq07WuxfyTMu7Nheg/sjJ+g0qwVXlN1B6H46zF58spz9prkopM438zuc2cYwctTEiUtK66kBh8NfoLqE2aJW1aYglbghDZWUf29Ia5+jGOnAqUxwRa7qZK3ldA/BbCvO5fhGWtK52/UrfvS6t7hb2uxhYZZ3q6pJKG+aESKXb0GNXSqA/fMNNtcylGRGsAs1cyesaoBr42UN7LipKz47zWO/YjwSy1LmBcwKgAq3hDdw1dwEVeAdNy150UtmWDCEczPmx61Cmaio2T2JLsyTFKvcfLpbKrU8SFP8FFbBKyoLgFRVQ9cKN/AWVYGyHMYGxs4b2zRIJLCgQXMxm2R4Hf0XlNnZN//yAip5LSD9JBcInjaeRJ7/oWOxHcRdUyjJJJen7FaPimhh9pVm20SZdbTJTssNuQff6cUel3lFZjvUUVH3rM6emm26WuQ43MUiIWizcu7Lc2VKJynR5cWfES5ayyRKarMcarhKdLYmO+nFnG+xByain21hfUwkmXdFjLHVi7DiTeZCM8mx2c0vxK1iOXrKdW4i/+Iuv8Q9m4j23gepttQAAAABJRU5ErkJggg=='; // Aquí va tu imagen codificada en base64
  doc.addImage(logoBase64, 'PNG', 10, 10, 40, 10);

  // Título principal
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Liquidación de Servicios ${factura.razonSocial}`, 10, 30);

  // Subtítulo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const fechaFactura = new Date(factura.fecha);
  const mes = fechaFactura.toLocaleString('default', { month: 'long' });
  const anio = fechaFactura.getFullYear();
  doc.text(`Año: ${anio}  Mes: ${mes}`, 10, 35);

  // ID de la factura
  doc.setFontSize(8);
  doc.text(`ID: ${factura.idFacturaCliente}`, 10, 40);

  // Configuración de la tabla
  const encabezado = factura.columnas;
  const filas = facturasOp.map((fila) =>
    encabezado.map((columna) => {
      const valor = this.obtenerDatos(factura, fila, clientes, columna, choferes);
      return valor !== undefined && valor !== null ? valor.toString() : '-';
    })
  );

  // Variable para la posición final y el ancho de la tabla
  let finalY = 0;
  let tableWidth = 0;
  let lastColumnWidth = 0;

  // Dibujar tabla con autoTable
  autoTable(doc, {
    head: [encabezado],
    body: filas,
    styles: {
      fontSize: factura.columnas.length <= 9 ? 8 : 7,
      cellPadding: factura.columnas.length <= 9 ? 3 : 2,
      lineWidth: 0.4,
      lineColor: [0, 0, 0],
    },
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
    margin: { top: 45, left:14 },
    columnStyles: {
      0: { halign: 'center' },
      [factura.columnas.length - 1]: { halign: 'center' },
    },
    didDrawPage: (data) => {
      finalY = data.cursor? data.cursor.y : 0; // Actualizar posición final de la tabla
      // Calcular el ancho total de la tabla sumando los anchos de las columnas
      tableWidth = data.table.columns.reduce((acc, column) => acc + column.width, 0);
      lastColumnWidth = data.table.columns[data.table.columns.length - 1].width; // Ancho de la última columna
    },
  });

  // Obtener total de páginas
  const totalPages = (doc as any).internal.getNumberOfPages();

  // Dibujar footer en la última página
  doc.setPage(totalPages); // Establecer la última página como activa
  const margin = 14;
  const footerHeight = 10;
  const fillColor = '#6495ED';

  // Footer dinámico
  doc.setFontSize(factura.columnas.length <= 9 ? 8 : 7);
  doc.setTextColor('black');

  // Subtotal
  if (factura.descuentos && factura.descuentos.length > 0) {
    // Subtotal: Dibujar las dos celdas
    doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
    const subtotalWidth = tableWidth - lastColumnWidth; // Ancho de la primera celda del subtotal
    doc.setFillColor(fillColor);
    doc.rect(margin, finalY, subtotalWidth, footerHeight, 'FD'); // Celda de texto
    doc.rect(margin + subtotalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

    doc.text('Subtotal', margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
    doc.text(
      `${this.formatearValor(factura.valores.totalAcompaniante + factura.valores.totalkmMonto + factura.valores.totalTarifaBase)}`,
      margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
        align: 'right',
        baseline: 'middle',
      });

    finalY += footerHeight;

    factura.descuentos.forEach((descuento) => {
      doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
      doc.setFillColor(fillColor);
      doc.rect(margin, finalY, subtotalWidth, footerHeight, 'FD'); // Celda de texto
      doc.rect(margin + subtotalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

      doc.text(descuento.concepto, margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
      doc.text(`- ${this.formatearValor(descuento.valor)}`, margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
        align: 'right',
        baseline: 'middle',
      });

      finalY += footerHeight;
    });
  }

  // Total: Dibujar las dos celdas
  doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
  const totalWidth = tableWidth - lastColumnWidth; // Ancho de la primera celda del total
  doc.setFillColor(fillColor);
  doc.rect(margin, finalY, totalWidth, footerHeight, 'FD'); // Celda de texto
  doc.rect(margin + totalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

  doc.text('Total', margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
  doc.text(`${this.formatearValor(factura.valores.total)}`, margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
    align: 'right',
    baseline: 'middle',
  });

  // Guardar PDF
  doc.save(`Detalle_${factura.razonSocial}_${factura.fecha}.pdf`);
}



  private generarFooter(factura: any): any[] {
    const footer = [];

    if (factura.valores.descuentoTotal > 0) {
      // Subtotal
      footer.push([
        {
          content: 'Sub Total',
          colSpan: factura.columnas.length - 1,
          styles: { halign: 'left', fontStyle: 'bold' }
        },
        {
          content: this.formatearValor(
            factura.valores.totalTarifaBase +
              factura.valores.totalAcompaniante +
              factura.valores.totalkmMonto
          ),
          styles: { halign: 'right', fontStyle: 'bold' }
        }
      ]);

      // Descuentos
      factura.descuentos.forEach((descuento:Descuento) => {
        footer.push([
          {
            content: descuento.concepto,
            colSpan: factura.columnas.length - 1,
            styles: { halign: 'left', fontStyle: 'normal' }
          },
          {
            content: `-${this.formatearValor(descuento.valor)}`,
            styles: { halign: 'right', fontStyle: 'normal' }
          }
        ]);
      });
    }

    // Total
    footer.push([
      {
        content: 'Total',
        colSpan: factura.columnas.length - 1,
        styles: { halign: 'left', fontStyle: 'bold' }
      },
      {
        content: this.formatearValor(factura.valores.total),
        styles: { halign: 'right', fontStyle: 'bold' }
      }
    ]);

    return footer;
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
   //////////console.log(nuevoValor);    
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

  
// Reportes PDF para los choferes
async exportToPdfChofer(factura: FacturaChofer, facturasOp: FacturaOp[], clientes: Cliente[], choferes:Chofer[]): Promise<void> {
  const doc = new jsPDF();

  // Logo en la parte superior izquierda
  const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMoAAAA+CAMAAABduHSVAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAABmUExURQAAAM8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJQ8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Uds8FJc8FJQ8Udv///1uXIdgAAAAfdFJOUwBAoGAgEPDQkLBw4MBAMPAQgNBggHAgwJBQ4FCwoDDMVBr9AAAAAWJLR0QhxGwNFgAAAAlwSFlzAAALEQAACxIBVEkMUgAAAAd0SU1FB+gFHAEwF7m7jRsAAAABb3JOVAHPoneaAAAAtGVYSWZJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAAC8ZAQDoAwAALxkBAOgDAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgAwABAAAAygAAAAOgAwABAAAAPgAAAAAAAABQJCBZAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI0LTA1LTI4VDAxOjQ4OjIyKzAwOjAwYrqLZwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNC0wNS0yOFQwMTo0ODoyMiswMDowMBPnM9sAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjQtMDUtMjhUMDE6NDg6MjMrMDA6MDDihRmwAAAAF3RFWHRleGlmOkNvbG9yU3BhY2UANjU1MzUsILj4LMsAAAAgdEVYdGV4aWY6Q29tcG9uZW50c0NvbmZpZ3VyYXRpb24ALi4uavKhZAAAABV0RVh0ZXhpZjpFeGlmT2Zmc2V0ADEwMiwg4HKYmQAAABV0RVh0ZXhpZjpFeGlmVmVyc2lvbgAwMjEwuHZWeAAAABl0RVh0ZXhpZjpGbGFzaFBpeFZlcnNpb24AMDEwMBLUKKwAAAAadEVYdGV4aWY6UGl4ZWxYRGltZW5zaW9uADIwMiwgoS3lbwAAABl0RVh0ZXhpZjpQaXhlbFlEaW1lbnNpb24ANjIsIBv2ioIAAAAZdEVYdGV4aWY6WUNiQ3JQb3NpdGlvbmluZwAxLCDg7k7SAAAGEElEQVRo3u1aaZeqOBANbvgUEVBBUYH//yuHVKWSqiS03Z4+wzjn3Q9tAlnq1paFVuovPhHJYrmaW4ZfwnrT9+k2mVuMX8GiB/zZfb5xVj1hv/h0Npnl0n+6ny3/D1QO+LO3VOYW6G3kxwJ+y8+nUg0n+LWBn80t0bs4D0OFpcWHU8mHETkUE0OlnFumN1FpKhcs7z+aylkzMQ5G+fgzc3E9OP/CjdjHUmk0k7Otbj83F1+4eynKx3NL9Q7qI3cvjczl4mJu6X4EcK8rf3JzVI75O0POBHCvtsCK24htsTQc67kFjKM4aIhH6F7m2b3F35KWlcMYRIVorweoVX6Iwc7gozAdhYlz86D+sgvXZG2nGScKwkI9mHuNr3Ejtu77G1HhCQEfjI3AKX1UZOMAenaZJUe044NGmUUtQGG2IBfGHaQ3IqqnLj/ZeHfuXk8cW+mNGC4rF7/9ASWLzj4t16i8IqBCD6JqGdxchBM8P96JGNScyxTcvaArGjTp1/CLkjEuZ2wTnf1KRv6GXGZdnqRiLZx7TJxLVcxEvnu1rJKy97wDUEG5AkzKdSTzcyqW29cWpuZPZMiCA7i1wr3ISFc77YgOf0gyy+UB3W1wa81UVNEG1VZuePhWXK5CeZIQlacf9bmZ6yiZ8AEU9yh0rzvTkrAAteZ2bQYbTxqtrEaCW4/wIEXxF6TzQzCpCuYqKjSVYIJDPhnVB3evmGSCy9H1iEleB1S451WBICoSREILDWPy9N7jLriwdpDuJQLNZImW21aKGkgeD26dUCtfS8TNJJIIaHCThK9Bg4YGRzvcmdDHxiOPkj0cFy/VB5JDAFSNQ8UjQggjgijGBLTQjmOI5UT5s7VkhwcbeLj4uRrTIbNvLNVzKiCXM7DBYWpZuRrVtioCkSaP0WgysS7c62yixMvVRmOOi0z1oUYh+ky6cSC57qyl5eYlEk/nhCgTnP+B7nXi7lWTg9imlA7tlsGT/elTaZhGBJX4snJXQSLx5LRWKWJNMPAfPFvZWwpvk2Y1Rlx4qo9p1CRnY8YB4+WqIsuK5RZ4ntAThZu/q2W6HsgO3L2UzNVcY2bb4K0jQVoiuXC/zUSMLytFuGeM6MksKrE2d6Jy4WaqWZk0wMRxnustKzwtueSce2nnjWXFqm1iWbGNGE9xS9H4HOmFjWWn6iAtMbkONnlJFfvcvEQSsXDExp5xrXvJWwq+SZMaIy7essLTEk/OcicLqpvcm8UOcVyP+eTSUgj38o5jbJMmlw2KZecNQVoSCe7MU88Qw/dPBQd/aovnlHspEfhe6jVc3HhBWpLJme1m3zgVSD0GpxXuGXnMvZRIAv6ygXb2WPNxvYhobEjGqdCyEiCyoRE25mjJDvXEaf8ckcxwkaKKtOQlZ5d64ufkyYNX7FQQO7GALUgCfowks9i7EboTcTgJUYP3/q1KQbcnX9+qBKjN4Ad/cHkDg3OYCcUtxXdwii9V80PcUnwP1/NPWv97iLjXS/w3byt/7F6/iuQX/13jDfdSq07WuxfyTMu7Nheg/sjJ+g0qwVXlN1B6H46zF58spz9prkopM438zuc2cYwctTEiUtK66kBh8NfoLqE2aJW1aYglbghDZWUf29Ia5+jGOnAqUxwRa7qZK3ldA/BbCvO5fhGWtK52/UrfvS6t7hb2uxhYZZ3q6pJKG+aESKXb0GNXSqA/fMNNtcylGRGsAs1cyesaoBr42UN7LipKz47zWO/YjwSy1LmBcwKgAq3hDdw1dwEVeAdNy150UtmWDCEczPmx61Cmaio2T2JLsyTFKvcfLpbKrU8SFP8FFbBKyoLgFRVQ9cKN/AWVYGyHMYGxs4b2zRIJLCgQXMxm2R4Hf0XlNnZN//yAip5LSD9JBcInjaeRJ7/oWOxHcRdUyjJJJen7FaPimhh9pVm20SZdbTJTssNuQff6cUel3lFZjvUUVH3rM6emm26WuQ43MUiIWizcu7Lc2VKJynR5cWfES5ayyRKarMcarhKdLYmO+nFnG+xByain21hfUwkmXdFjLHVi7DiTeZCM8mx2c0vxK1iOXrKdW4i/+Iuv8Q9m4j23gepttQAAAABJRU5ErkJggg=='; // Aquí va tu imagen codificada en base64
  doc.addImage(logoBase64, 'PNG', 10, 10, 40, 10);

  // Título principal
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Liquidación de Servicios ${factura.apellido} ${factura.nombre}`, 10, 30);

  // Subtítulo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const fechaFactura = new Date(factura.fecha);
  const mes = fechaFactura.toLocaleString('default', { month: 'long' });
  const anio = fechaFactura.getFullYear();
  doc.text(`Año: ${anio}  Mes: ${mes}`, 10, 35);

  // ID de la factura
  doc.setFontSize(8);
  doc.text(`ID: ${factura.idFacturaChofer}`, 10, 40);

  // Configuración de la tabla
  const encabezado = factura.columnas;
  const filas = facturasOp.map((fila) =>
    encabezado.map((columna) => {
      const valor = this.obtenerDatos(factura, fila, clientes, columna, choferes);
      return valor !== undefined && valor !== null ? valor.toString() : '-';
    })
  );

  // Variable para la posición final y el ancho de la tabla
  let finalY = 0;
  let tableWidth = 0;
  let lastColumnWidth = 0;

  // Dibujar tabla con autoTable
  autoTable(doc, {
    head: [encabezado],
    body: filas,
    styles: {
      fontSize: factura.columnas.length <= 9 ? 8 : 7,
      cellPadding: factura.columnas.length <= 9 ? 3 : 2,
      lineWidth: 0.4,
      lineColor: [0, 0, 0],
    },
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
    margin: { top: 45, left:14 },
    columnStyles: {
      0: { halign: 'center' },
      [factura.columnas.length - 1]: { halign: 'center' },
    },
    didDrawPage: (data) => {
      finalY = data.cursor? data.cursor.y : 0; // Actualizar posición final de la tabla
      // Calcular el ancho total de la tabla sumando los anchos de las columnas
      tableWidth = data.table.columns.reduce((acc, column) => acc + column.width, 0);
      lastColumnWidth = data.table.columns[data.table.columns.length - 1].width; // Ancho de la última columna
    },
  });

  // Obtener total de páginas
  const totalPages = (doc as any).internal.getNumberOfPages();

  // Dibujar footer en la última página
  doc.setPage(totalPages); // Establecer la última página como activa
  const margin = 14;
  const footerHeight = 10;
  const fillColor = '#6495ED';

  // Footer dinámico
  doc.setFontSize(factura.columnas.length <= 9 ? 8 : 7);
  doc.setTextColor('black');

  // Subtotal
  if (factura.descuentos && factura.descuentos.length > 0) {
    // Subtotal: Dibujar las dos celdas
    doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
    const subtotalWidth = tableWidth - lastColumnWidth; // Ancho de la primera celda del subtotal
    doc.setFillColor(fillColor);
    doc.rect(margin, finalY, subtotalWidth, footerHeight, 'FD'); // Celda de texto
    doc.rect(margin + subtotalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

    doc.text('Subtotal', margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
    doc.text(
      `${this.formatearValor(factura.valores.totalAcompaniante + factura.valores.totalkmMonto + factura.valores.totalTarifaBase)}`,
      margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
        align: 'right',
        baseline: 'middle',
      });

    finalY += footerHeight;

    factura.descuentos.forEach((descuento) => {
      doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
      doc.setFillColor(fillColor);
      doc.rect(margin, finalY, subtotalWidth, footerHeight, 'FD'); // Celda de texto
      doc.rect(margin + subtotalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

      doc.text(descuento.concepto, margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
      doc.text(`- ${this.formatearValor(descuento.valor)}`, margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
        align: 'right',
        baseline: 'middle',
      });

      finalY += footerHeight;
    });
  }

  // Total: Dibujar las dos celdas
  doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
  const totalWidth = tableWidth - lastColumnWidth; // Ancho de la primera celda del total
  doc.setFillColor(fillColor);
  doc.rect(margin, finalY, totalWidth, footerHeight, 'FD'); // Celda de texto
  doc.rect(margin + totalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

  doc.text('Total', margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
  doc.text(`${this.formatearValor(factura.valores.total)}`, margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
    align: 'right',
    baseline: 'middle',
  });

  doc.save(`Detalle_${factura.apellido}_${factura.nombre}_${factura.fecha}.pdf`);
}

//////////////////// Reportes PDF para los proveedores
async exportToPdfProveedor(factura: FacturaProveedor, facturasOp: FacturaOp[], clientes: Cliente [], choferes: Chofer[]): Promise<void> {
  const doc = new jsPDF();

  // Logo en la parte superior izquierda
  const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMoAAAA+CAMAAABduHSVAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAABmUExURQAAAM8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJQ8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Uds8FJc8FJQ8Udv///1uXIdgAAAAfdFJOUwBAoGAgEPDQkLBw4MBAMPAQgNBggHAgwJBQ4FCwoDDMVBr9AAAAAWJLR0QhxGwNFgAAAAlwSFlzAAALEQAACxIBVEkMUgAAAAd0SU1FB+gFHAEwF7m7jRsAAAABb3JOVAHPoneaAAAAtGVYSWZJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAAC8ZAQDoAwAALxkBAOgDAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgAwABAAAAygAAAAOgAwABAAAAPgAAAAAAAABQJCBZAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI0LTA1LTI4VDAxOjQ4OjIyKzAwOjAwYrqLZwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNC0wNS0yOFQwMTo0ODoyMiswMDowMBPnM9sAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjQtMDUtMjhUMDE6NDg6MjMrMDA6MDDihRmwAAAAF3RFWHRleGlmOkNvbG9yU3BhY2UANjU1MzUsILj4LMsAAAAgdEVYdGV4aWY6Q29tcG9uZW50c0NvbmZpZ3VyYXRpb24ALi4uavKhZAAAABV0RVh0ZXhpZjpFeGlmT2Zmc2V0ADEwMiwg4HKYmQAAABV0RVh0ZXhpZjpFeGlmVmVyc2lvbgAwMjEwuHZWeAAAABl0RVh0ZXhpZjpGbGFzaFBpeFZlcnNpb24AMDEwMBLUKKwAAAAadEVYdGV4aWY6UGl4ZWxYRGltZW5zaW9uADIwMiwgoS3lbwAAABl0RVh0ZXhpZjpQaXhlbFlEaW1lbnNpb24ANjIsIBv2ioIAAAAZdEVYdGV4aWY6WUNiQ3JQb3NpdGlvbmluZwAxLCDg7k7SAAAGEElEQVRo3u1aaZeqOBANbvgUEVBBUYH//yuHVKWSqiS03Z4+wzjn3Q9tAlnq1paFVuovPhHJYrmaW4ZfwnrT9+k2mVuMX8GiB/zZfb5xVj1hv/h0Npnl0n+6ny3/D1QO+LO3VOYW6G3kxwJ+y8+nUg0n+LWBn80t0bs4D0OFpcWHU8mHETkUE0OlnFumN1FpKhcs7z+aylkzMQ5G+fgzc3E9OP/CjdjHUmk0k7Otbj83F1+4eynKx3NL9Q7qI3cvjczl4mJu6X4EcK8rf3JzVI75O0POBHCvtsCK24htsTQc67kFjKM4aIhH6F7m2b3F35KWlcMYRIVorweoVX6Iwc7gozAdhYlz86D+sgvXZG2nGScKwkI9mHuNr3Ejtu77G1HhCQEfjI3AKX1UZOMAenaZJUe044NGmUUtQGG2IBfGHaQ3IqqnLj/ZeHfuXk8cW+mNGC4rF7/9ASWLzj4t16i8IqBCD6JqGdxchBM8P96JGNScyxTcvaArGjTp1/CLkjEuZ2wTnf1KRv6GXGZdnqRiLZx7TJxLVcxEvnu1rJKy97wDUEG5AkzKdSTzcyqW29cWpuZPZMiCA7i1wr3ISFc77YgOf0gyy+UB3W1wa81UVNEG1VZuePhWXK5CeZIQlacf9bmZ6yiZ8AEU9yh0rzvTkrAAteZ2bQYbTxqtrEaCW4/wIEXxF6TzQzCpCuYqKjSVYIJDPhnVB3evmGSCy9H1iEleB1S451WBICoSREILDWPy9N7jLriwdpDuJQLNZImW21aKGkgeD26dUCtfS8TNJJIIaHCThK9Bg4YGRzvcmdDHxiOPkj0cFy/VB5JDAFSNQ8UjQggjgijGBLTQjmOI5UT5s7VkhwcbeLj4uRrTIbNvLNVzKiCXM7DBYWpZuRrVtioCkSaP0WgysS7c62yixMvVRmOOi0z1oUYh+ky6cSC57qyl5eYlEk/nhCgTnP+B7nXi7lWTg9imlA7tlsGT/elTaZhGBJX4snJXQSLx5LRWKWJNMPAfPFvZWwpvk2Y1Rlx4qo9p1CRnY8YB4+WqIsuK5RZ4ntAThZu/q2W6HsgO3L2UzNVcY2bb4K0jQVoiuXC/zUSMLytFuGeM6MksKrE2d6Jy4WaqWZk0wMRxnustKzwtueSce2nnjWXFqm1iWbGNGE9xS9H4HOmFjWWn6iAtMbkONnlJFfvcvEQSsXDExp5xrXvJWwq+SZMaIy7essLTEk/OcicLqpvcm8UOcVyP+eTSUgj38o5jbJMmlw2KZecNQVoSCe7MU88Qw/dPBQd/aovnlHspEfhe6jVc3HhBWpLJme1m3zgVSD0GpxXuGXnMvZRIAv6ygXb2WPNxvYhobEjGqdCyEiCyoRE25mjJDvXEaf8ckcxwkaKKtOQlZ5d64ufkyYNX7FQQO7GALUgCfowks9i7EboTcTgJUYP3/q1KQbcnX9+qBKjN4Ad/cHkDg3OYCcUtxXdwii9V80PcUnwP1/NPWv97iLjXS/w3byt/7F6/iuQX/13jDfdSq07WuxfyTMu7Nheg/sjJ+g0qwVXlN1B6H46zF58spz9prkopM438zuc2cYwctTEiUtK66kBh8NfoLqE2aJW1aYglbghDZWUf29Ia5+jGOnAqUxwRa7qZK3ldA/BbCvO5fhGWtK52/UrfvS6t7hb2uxhYZZ3q6pJKG+aESKXb0GNXSqA/fMNNtcylGRGsAs1cyesaoBr42UN7LipKz47zWO/YjwSy1LmBcwKgAq3hDdw1dwEVeAdNy150UtmWDCEczPmx61Cmaio2T2JLsyTFKvcfLpbKrU8SFP8FFbBKyoLgFRVQ9cKN/AWVYGyHMYGxs4b2zRIJLCgQXMxm2R4Hf0XlNnZN//yAip5LSD9JBcInjaeRJ7/oWOxHcRdUyjJJJen7FaPimhh9pVm20SZdbTJTssNuQff6cUel3lFZjvUUVH3rM6emm26WuQ43MUiIWizcu7Lc2VKJynR5cWfES5ayyRKarMcarhKdLYmO+nFnG+xByain21hfUwkmXdFjLHVi7DiTeZCM8mx2c0vxK1iOXrKdW4i/+Iuv8Q9m4j23gepttQAAAABJRU5ErkJggg=='; // Aquí va tu imagen codificada en base64
  doc.addImage(logoBase64, 'PNG', 10, 10, 40, 10);

  // Título principal
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Liquidación de Servicios ${factura.razonSocial}`, 10, 30);

  // Subtítulo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const fechaFactura = new Date(factura.fecha);
  const mes = fechaFactura.toLocaleString('default', { month: 'long' });
  const anio = fechaFactura.getFullYear();
  doc.text(`Año: ${anio}  Mes: ${mes}`, 10, 35);

  // ID de la factura
  doc.setFontSize(8);
  doc.text(`ID: ${factura.idFacturaProveedor}`, 10, 40);

  // Configuración de la tabla
  const encabezado = factura.columnas;
  const filas = facturasOp.map((fila) =>
    encabezado.map((columna) => {
      const valor = this.obtenerDatos(factura, fila, clientes, columna, choferes);
      return valor !== undefined && valor !== null ? valor.toString() : '-';
    })
  );

  // Variable para la posición final y el ancho de la tabla
  let finalY = 0;
  let tableWidth = 0;
  let lastColumnWidth = 0;

  // Dibujar tabla con autoTable
  autoTable(doc, {
    head: [encabezado],
    body: filas,
    styles: {
      fontSize: factura.columnas.length <= 9 ? 8 : 7,
      cellPadding: factura.columnas.length <= 9 ? 3 : 2,
      lineWidth: 0.4,
      lineColor: [0, 0, 0],
    },
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
    margin: { top: 45, left:14 },
    columnStyles: {
      0: { halign: 'center' },
      [factura.columnas.length - 1]: { halign: 'center' },
    },
    didDrawPage: (data) => {
      finalY = data.cursor? data.cursor.y : 0; // Actualizar posición final de la tabla
      // Calcular el ancho total de la tabla sumando los anchos de las columnas
      tableWidth = data.table.columns.reduce((acc, column) => acc + column.width, 0);
      lastColumnWidth = data.table.columns[data.table.columns.length - 1].width; // Ancho de la última columna
    },
  });

  // Obtener total de páginas
  const totalPages = (doc as any).internal.getNumberOfPages();

  // Dibujar footer en la última página
  doc.setPage(totalPages); // Establecer la última página como activa
  const margin = 14;
  const footerHeight = 10;
  const fillColor = '#6495ED';

  // Footer dinámico
  doc.setFontSize(factura.columnas.length <= 9 ? 8 : 7);
  doc.setTextColor('black');

  // Subtotal
  if (factura.descuentos && factura.descuentos.length > 0) {
    // Subtotal: Dibujar las dos celdas
    doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
    const subtotalWidth = tableWidth - lastColumnWidth; // Ancho de la primera celda del subtotal
    doc.setFillColor(fillColor);
    doc.rect(margin, finalY, subtotalWidth, footerHeight, 'FD'); // Celda de texto
    doc.rect(margin + subtotalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

    doc.text('Subtotal', margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
    doc.text(
      `${this.formatearValor(factura.valores.totalAcompaniante + factura.valores.totalkmMonto + factura.valores.totalTarifaBase)}`,
      margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
        align: 'right',
        baseline: 'middle',
      });

    finalY += footerHeight;

    factura.descuentos.forEach((descuento) => {
      doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
      doc.setFillColor(fillColor);
      doc.rect(margin, finalY, subtotalWidth, footerHeight, 'FD'); // Celda de texto
      doc.rect(margin + subtotalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

      doc.text(descuento.concepto, margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
      doc.text(`- ${this.formatearValor(descuento.valor)}`, margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
        align: 'right',
        baseline: 'middle',
      });

      finalY += footerHeight;
    });
  }

  // Total: Dibujar las dos celdas
  doc.setLineWidth(0.4); // Asegurar el mismo grosor de línea que la tabla
  const totalWidth = tableWidth - lastColumnWidth; // Ancho de la primera celda del total
  doc.setFillColor(fillColor);
  doc.rect(margin, finalY, totalWidth, footerHeight, 'FD'); // Celda de texto
  doc.rect(margin + totalWidth, finalY, lastColumnWidth, footerHeight, 'FD'); // Celda de valor

  doc.text('Total', margin + 5, finalY + footerHeight / 2, { baseline: 'middle' });
  doc.text(`${this.formatearValor(factura.valores.total)}`, margin + tableWidth - (factura.columnas.length <= 9 ? 3 : 2), finalY + footerHeight / 2, {
    align: 'right',
    baseline: 'middle',
  });

  doc.save(`Detalle_${factura.razonSocial}_${factura.fecha}.pdf`);

}


}
