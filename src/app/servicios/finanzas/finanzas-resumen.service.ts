import { Injectable } from '@angular/core';
import {
  Firestore,
  Timestamp,
  doc,
  runTransaction
} from '@angular/fire/firestore';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { ResumenFinancieroEntidad } from 'src/app/interfaces/resumen-financiero-entidad';

@Injectable({
  providedIn: 'root'
})
export class FinanzasResumenService {

  constructor(private firestore: Firestore) {}

async aplicarNuevaLiquidacion(informe: InformeLiq): Promise<void> {

  const entidadKey = `${informe.tipo}_${informe.entidad.id}`;

  const ref = doc(
    this.firestore,
    `/Vantruck/datos/resumenFinanzas/${entidadKey}`
  );

  await runTransaction(this.firestore, async (tx) => {

    const snap = await tx.get(ref);

    const monto = informe.valores.total;

    if (!snap.exists()) {

      const nuevoResumen: ResumenFinancieroEntidad = {

        entidadId: informe.entidad.id.toString(),

        tipoEntidad: informe.tipo,

        razonSocial: informe.entidad.razonSocial,

        cuit: informe.entidad.cuit?.toString(),

        totalFacturado: monto,

        totalCobrado: 0,

        saldoPendiente: monto,

        cantidadInformes: 1,

        cantidadPendientes: 1,

        createdAt: Timestamp.now(),

        updatedAt: Timestamp.now()

      };

      tx.set(ref, nuevoResumen);

      return;

    }

    const data = snap.data() as ResumenFinancieroEntidad;

    tx.update(ref, {

      totalFacturado: data.totalFacturado + monto,

      saldoPendiente: data.saldoPendiente + monto,

      cantidadInformes: data.cantidadInformes + 1,

      cantidadPendientes: data.cantidadPendientes + 1,

      updatedAt: Timestamp.now()

    });

  });

}

async aplicarPago(
  tipoEntidad: 'cliente' | 'chofer' | 'proveedor',
  entidadId: number,
  monto: number,
  informeCancelado: boolean
): Promise<void> {

  const ref = doc(
    this.firestore,
    `/Vantruck/datos/resumenFinanzas/${tipoEntidad}_${entidadId}`
  );

  await runTransaction(this.firestore, async (tx) => {

    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error('No existe resumen financiero de la entidad');
    }

    const data = snap.data() as ResumenFinancieroEntidad;

    const updateData: any = {

      totalCobrado: data.totalCobrado + monto,

      saldoPendiente: data.saldoPendiente - monto,

      updatedAt: Timestamp.now()

    };

    if (informeCancelado) {
      updateData.cantidadPendientes = data.cantidadPendientes - 1;
    }

    tx.update(ref, updateData);

  });

}

async revertirLiquidacion(informe: InformeLiq): Promise<void> {

  const ref = doc(
    this.firestore,
    `/Vantruck/datos/resumenFinanzas/${informe.tipo}_${informe.entidad.id}`
  );

  await runTransaction(this.firestore, async (tx) => {

    const snap = await tx.get(ref);

    if (!snap.exists()) {
      throw new Error('Resumen financiero inexistente');
    }

    const data = snap.data() as ResumenFinancieroEntidad;

    const updateData: any = {

      totalFacturado: data.totalFacturado - informe.valores.total,

      saldoPendiente: data.saldoPendiente - informe.valoresFinancieros.saldo,

      cantidadInformes: data.cantidadInformes - 1,

      updatedAt: Timestamp.now()

    };

    if (informe.estadoFinanciero !== 'cobrado') {

      updateData.cantidadPendientes =
        data.cantidadPendientes - 1;

    }

    tx.update(ref, updateData);

  });

}

}