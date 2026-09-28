import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { PapeleraService } from 'src/app/servicios/papelera/papelera.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

export interface ConteoColeccion {
  coleccion: string;
  cantidad: number;
}

export interface NumeradorActual {
  id: string;
  ultimoNumero: number | null;
}

export interface InventarioLimpieza {
  colecciones: ConteoColeccion[];
  /** Eventos de papelera de operaciones (y objetos archivados que referencian). */
  eventosPapelera: number;
  objetosPapelera: number;
  numeradores: NumeradorActual[];
}

export interface ResultadoLimpieza {
  /** Documentos borrados por colección. */
  colecciones: ConteoColeccion[];
  eventosPapelera: number;
  objetosPapelera: number;
  numeradoresReiniciados: number;
}

/** Herramienta de desarrollo: deja la base de DEMO sin datos operativos
 *  (operaciones, tablero, informes, resúmenes, finanzas, log, papelera de
 *  operaciones) y reinicia los numeradores, conservando las entidades.
 *  Se usa antes de generar operaciones de prueba (diseño:
 *  claude/diseno-generador-operaciones.md §8–§9).
 *
 *  Seguridad: todo método público verifica proyecto 'demoapplog' y rol
 *  'dev' (además del RoleGuard de la ruta). Solo toca las colecciones de
 *  COLECCIONES_A_VACIAR: una colección que no esté ahí nunca se borra.
 *  Las colecciones del modelo viejo y los backups se purgan aparte, una
 *  vez, con la Firebase CLI. Storage no se toca. */
@Injectable({ providedIn: 'root' })
export class LimpiezaDemoService {

  private db = inject(DbFirestoreService);
  private papelera = inject(PapeleraService);
  private usuarioSesion = inject(UsuarioSesionService);

  static readonly PROYECTO_DEMO = 'demoapplog';

  readonly COLECCIONES_A_VACIAR: readonly string[] = [
    'operaciones',
    'asignaciones',
    'informesOp',
    'informesLiq',
    'informesLiqSnapshots',
    'facturasVinculadas',
    'informesVenta',
    'registrosOpEventuales',
    'resumenOpMensual',
    'movimientos',
    'resumenFinanzas',
    'registroLog',
  ];

  get proyecto(): string {
    return environment.firebase.projectId;
  }

  esEntornoDemo(): boolean {
    return environment.firebase.projectId === LimpiezaDemoService.PROYECTO_DEMO;
  }

  /** Inventario sin escribir nada: documentos por colección, papelera de
   *  operaciones y valor actual de cada numerador. */
  async inventario(): Promise<InventarioLimpieza> {
    this.verificarEntorno();

    const colecciones: ConteoColeccion[] = [];
    for (const coleccion of this.COLECCIONES_A_VACIAR) {
      colecciones.push({ coleccion, cantidad: await this.db.contarDocumentos(coleccion) });
    }
    const purga = await this.papelera.armarPurgaPorColeccion('operaciones');
    const numeradores = (await this.db.obtenerTodosConId<{ ultimoNumero?: number }>('numeradores'))
      .map(n => ({ id: n.id, ultimoNumero: n.data.ultimoNumero ?? null }));

    return { colecciones, eventosPapelera: purga.eventos, objetosPapelera: purga.objetos, numeradores };
  }

  /** Limpieza. Orden: 1) papelera de operaciones, 2) colecciones
   *  operativas, 3) numeradores a 0. No es atómica (son miles de
   *  documentos): si se corta, se vuelve a ejecutar y sigue desde donde
   *  quedó (cada paso borra lo que encuentre). */
  async limpiar(alAvanzar: (mensaje: string) => void): Promise<ResultadoLimpieza> {
    this.verificarEntorno();

    alAvanzar('Papelera: eventos de operaciones…');
    const purga = await this.papelera.armarPurgaPorColeccion('operaciones');
    if (purga.escrituras.length > 0) {
      await this.db.commitBatch(purga.escrituras);
    }

    const colecciones: ConteoColeccion[] = [];
    for (const coleccion of this.COLECCIONES_A_VACIAR) {
      alAvanzar(`${coleccion}…`);
      const cantidad = await this.db.eliminarTodosLosDocumentos(
        coleccion, n => alAvanzar(`${coleccion}: ${n} borrados…`),
      );
      colecciones.push({ coleccion, cantidad });
    }

    // Numeradores: update a 0 (las reglas no permiten borrarlos; todo el
    // código de numeración hace "último + 1").
    alAvanzar('Numeradores…');
    const numeradores = await this.db.obtenerTodosConId<{ ultimoNumero?: number }>('numeradores');
    const escrituras: EscrituraBatch[] = numeradores.map(n => ({
      coleccion: 'numeradores', id: n.id, data: { ultimoNumero: 0 }, modo: 'actualizar' as const,
    }));
    if (escrituras.length > 0) {
      await this.db.commitBatch(escrituras);
    }

    return {
      colecciones,
      eventosPapelera: purga.eventos,
      objetosPapelera: purga.objetos,
      numeradoresReiniciados: numeradores.length,
    };
  }

  private verificarEntorno(): void {
    if (!this.esEntornoDemo()) {
      throw new Error(`Limpieza bloqueada: el proyecto es '${this.proyecto}', no '${LimpiezaDemoService.PROYECTO_DEMO}'.`);
    }
    if (this.usuarioSesion.getRol() !== 'dev') {
      throw new Error('Limpieza bloqueada: requiere rol dev.');
    }
  }
}
