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
  async exportToPdfCliente(factura: FacturaCliente, facturasOp: FacturaOp[], choferes: Chofer[]): Promise<void> {
    const quincena = this.getQuincena(factura.fecha);
    ////console.log()(pdfMake.vfs);
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
        { text: `Id ${factura.idFacturaCliente}`, style: 'headerId' },
        {
          table: {
            widths: [ 47, 43 , 60, 60 , 20 , 65 , 50 , 45, '*' ],
            body: [
              // Fila estática con encabezados
              [{ text: 'Fecha', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
               { text: 'Quincena', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
            /*    { text: 'Mes', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
               { text: 'Año', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },  */
               //{ text: 'Id Op', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
               { text: 'Chofer', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
               { text: 'Concepto', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }, 
               { text: 'Km', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },                
               { text: 'Jornada', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },
               { text: 'Adic. Km', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },
               { text: 'Acomp.', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' },
               { text: 'A cobrar', style: 'tableHeader', fillColor: headerRowFillColor, alignment: 'center' }],
              // Filas dinámicas
              ...facturasOp.map(facOp => [
                { text: facOp.fecha, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
                { text: this.getQuincena(facOp.fecha), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
               /*  { text: `${new Date(facOp.fecha).getMonth() + 1}`, fillColor: dynamicRowFillColor, alignment: 'center' }, 
                { text: `${new Date(facOp.fecha).getFullYear()}`, fillColor: dynamicRowFillColor, alignment: 'center' },  */
                //{ text: facOp.operacion.idOperacion, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
                { text: this.getChofer(facOp.idChofer, choferes), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
                { text: facOp.observaciones, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
                { text: facOp.km, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
                { text: this.formatearValor(facOp.valores.tarifaBase), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
                { text: this.formatearValor(facOp.valores.kmMonto), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
                { text: this.formatearValor(facOp.valores.acompaniante), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, 
                /* { text: `${facOp.tarifaTipo.eventual? "Tarifa Especial": this.formatearValor(facOp.valores.total)}`, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' },
                { text: `${facOp.tarifaTipo.eventual? "": this.formatearValor(facOp.valores.kmMonto)}`, style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }, */
                { text: this.formatearValor(facOp.valores.total), style: 'body', fillColor: dynamicRowFillColor, alignment: 'center' }
              ]),
              // Fila estática con el total
              [{ text: 'Total', colSpan: 8, style: 'tableHeader', fillColor: totalRowFillColor},{}, {}, {}, {}, {}, {}, {}, { text: this.formatearValor(factura.total), style: 'tableHeader', fillColor: totalRowFillColor, alignment: 'center' }]
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

  
// Reportes PDF para los choferes
async exportToPdfChofer(factura: FacturaChofer, facturasOp: FacturaOp[], clientes: Cliente[]): Promise<void> {
  const quincena = this.getQuincena(factura.fecha);
  ////console.log()(pdfMake.vfs);
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
              [{ text: 'Total', colSpan: 7, style: 'tableHeader', fillColor: totalRowFillColor}, {}, {}, {}, {}, {}, {}, { text: this.formatearValor(factura.total), style: 'tableHeader', fillColor: totalRowFillColor, alignment: 'center' }]
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
  ////console.log()(pdfMake.vfs);
  const imageContent = {
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMoAAAA+CAMAAABduHSVAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAABmUExURQAAAM8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJc8FJQ8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Udg8Udg8Udg8Uds8FJQ8Udg8Udg8Udg8Uds8FJc8FJQ8Udv///1uXIdgAAAAfdFJOUwBAoGAgEPDQkLBw4MBAMPAQgNBggHAgwJBQ4FCwoDDMVBr9AAAAAWJLR0QhxGwNFgAAAAlwSFlzAAALEQAACxIBVEkMUgAAAAd0SU1FB+gFHAEwF7m7jRsAAAABb3JOVAHPoneaAAAAtGVYSWZJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAAC8ZAQDoAwAALxkBAOgDAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgAwABAAAAygAAAAOgAwABAAAAPgAAAAAAAABQJCBZAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI0LTA1LTI4VDAxOjQ4OjIyKzAwOjAwYrqLZwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNC0wNS0yOFQwMTo0ODoyMiswMDowMBPnM9sAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjQtMDUtMjhUMDE6NDg6MjMrMDA6MDDihRmwAAAAF3RFWHRleGlmOkNvbG9yU3BhY2UANjU1MzUsILj4LMsAAAAgdEVYdGV4aWY6Q29tcG9uZW50c0NvbmZpZ3VyYXRpb24ALi4uavKhZAAAABV0RVh0ZXhpZjpFeGlmT2Zmc2V0ADEwMiwg4HKYmQAAABV0RVh0ZXhpZjpFeGlmVmVyc2lvbgAwMjEwuHZWeAAAABl0RVh0ZXhpZjpGbGFzaFBpeFZlcnNpb24AMDEwMBLUKKwAAAAadEVYdGV4aWY6UGl4ZWxYRGltZW5zaW9uADIwMiwgoS3lbwAAABl0RVh0ZXhpZjpQaXhlbFlEaW1lbnNpb24ANjIsIBv2ioIAAAAZdEVYdGV4aWY6WUNiQ3JQb3NpdGlvbmluZwAxLCDg7k7SAAAGEElEQVRo3u1aaZeqOBANbvgUEVBBUYH//yuHVKWSqiS03Z4+wzjn3Q9tAlnq1paFVuovPhHJYrmaW4ZfwnrT9+k2mVuMX8GiB/zZfb5xVj1hv/h0Npnl0n+6ny3/D1QO+LO3VOYW6G3kxwJ+y8+nUg0n+LWBn80t0bs4D0OFpcWHU8mHETkUE0OlnFumN1FpKhcs7z+aylkzMQ5G+fgzc3E9OP/CjdjHUmk0k7Otbj83F1+4eynKx3NL9Q7qI3cvjczl4mJu6X4EcK8rf3JzVI75O0POBHCvtsCK24htsTQc67kFjKM4aIhH6F7m2b3F35KWlcMYRIVorweoVX6Iwc7gozAdhYlz86D+sgvXZG2nGScKwkI9mHuNr3Ejtu77G1HhCQEfjI3AKX1UZOMAenaZJUe044NGmUUtQGG2IBfGHaQ3IqqnLj/ZeHfuXk8cW+mNGC4rF7/9ASWLzj4t16i8IqBCD6JqGdxchBM8P96JGNScyxTcvaArGjTp1/CLkjEuZ2wTnf1KRv6GXGZdnqRiLZx7TJxLVcxEvnu1rJKy97wDUEG5AkzKdSTzcyqW29cWpuZPZMiCA7i1wr3ISFc77YgOf0gyy+UB3W1wa81UVNEG1VZuePhWXK5CeZIQlacf9bmZ6yiZ8AEU9yh0rzvTkrAAteZ2bQYbTxqtrEaCW4/wIEXxF6TzQzCpCuYqKjSVYIJDPhnVB3evmGSCy9H1iEleB1S451WBICoSREILDWPy9N7jLriwdpDuJQLNZImW21aKGkgeD26dUCtfS8TNJJIIaHCThK9Bg4YGRzvcmdDHxiOPkj0cFy/VB5JDAFSNQ8UjQggjgijGBLTQjmOI5UT5s7VkhwcbeLj4uRrTIbNvLNVzKiCXM7DBYWpZuRrVtioCkSaP0WgysS7c62yixMvVRmOOi0z1oUYh+ky6cSC57qyl5eYlEk/nhCgTnP+B7nXi7lWTg9imlA7tlsGT/elTaZhGBJX4snJXQSLx5LRWKWJNMPAfPFvZWwpvk2Y1Rlx4qo9p1CRnY8YB4+WqIsuK5RZ4ntAThZu/q2W6HsgO3L2UzNVcY2bb4K0jQVoiuXC/zUSMLytFuGeM6MksKrE2d6Jy4WaqWZk0wMRxnustKzwtueSce2nnjWXFqm1iWbGNGE9xS9H4HOmFjWWn6iAtMbkONnlJFfvcvEQSsXDExp5xrXvJWwq+SZMaIy7essLTEk/OcicLqpvcm8UOcVyP+eTSUgj38o5jbJMmlw2KZecNQVoSCe7MU88Qw/dPBQd/aovnlHspEfhe6jVc3HhBWpLJme1m3zgVSD0GpxXuGXnMvZRIAv6ygXb2WPNxvYhobEjGqdCyEiCyoRE25mjJDvXEaf8ckcxwkaKKtOQlZ5d64ufkyYNX7FQQO7GALUgCfowks9i7EboTcTgJUYP3/q1KQbcnX9+qBKjN4Ad/cHkDg3OYCcUtxXdwii9V80PcUnwP1/NPWv97iLjXS/w3byt/7F6/iuQX/13jDfdSq07WuxfyTMu7Nheg/sjJ+g0qwVXlN1B6H46zF58spz9prkopM438zuc2cYwctTEiUtK66kBh8NfoLqE2aJW1aYglbghDZWUf29Ia5+jGOnAqUxwRa7qZK3ldA/BbCvO5fhGWtK52/UrfvS6t7hb2uxhYZZ3q6pJKG+aESKXb0GNXSqA/fMNNtcylGRGsAs1cyesaoBr42UN7LipKz47zWO/YjwSy1LmBcwKgAq3hDdw1dwEVeAdNy150UtmWDCEczPmx61Cmaio2T2JLsyTFKvcfLpbKrU8SFP8FFbBKyoLgFRVQ9cKN/AWVYGyHMYGxs4b2zRIJLCgQXMxm2R4Hf0XlNnZN//yAip5LSD9JBcInjaeRJ7/oWOxHcRdUyjJJJen7FaPimhh9pVm20SZdbTJTssNuQff6cUel3lFZjvUUVH3rM6emm26WuQ43MUiIWizcu7Lc2VKJynR5cWfES5ayyRKarMcarhKdLYmO+nFnG+xByain21hfUwkmXdFjLHVi7DiTeZCM8mx2c0vxK1iOXrKdW4i/+Iuv8Q9m4j23gepttQAAAABJRU5ErkJggg==', // Aquí va tu imagen codificada en base64
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
            [{ text: 'Total', colSpan: 8, style: 'tableHeader', fillColor: totalRowFillColor}, {}, {}, {}, {}, {}, {},  {}, { text: this.formatearValor(factura.total), style: 'tableHeader', fillColor: totalRowFillColor, alignment: 'center' }]
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




}
