import { Injectable, inject } from '@angular/core';
import { DatosEmpresa } from 'src/app/interfaces/configuracion-empresa';
import { Resultado } from 'src/app/interfaces/resultado';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import {
  COLECCION_CONFIGURACION, ID_DATOS_EMPRESA, normalizarDatosEmpresa, validarDatosEmpresa,
} from 'src/app/shared/utils/datos-empresa.util';

/** Dueño de `configuracion/empresa` (F8b): leer (con caché en memoria
 *  durante la sesión) y guardar con log EDITAR / ALTA en el mismo batch.
 *  Reglas: lectura para cualquier rol autenticado; escritura dev / admin. */
@Injectable({ providedIn: 'root' })
export class ConfiguracionEmpresaService {

  private db = inject(DbFirestoreService);
  private logRegistro = inject(LogRegistroService);
  private usuarioSesion = inject(UsuarioSesionService);

  /** undefined = todavía no se leyó; null = el documento no existe. */
  private cache: DatosEmpresa | null | undefined = undefined;

  /** Datos de la empresa, o null si todavía no se cargaron. `forzar` relee
   *  de Firestore (la pantalla de Ajustes lo usa al abrir). */
  async obtener(forzar = false): Promise<DatosEmpresa | null> {
    if (!forzar && this.cache !== undefined) return this.cache;
    this.cache = await this.db.getById<DatosEmpresa>(COLECCION_CONFIGURACION, ID_DATOS_EMPRESA);
    return this.cache;
  }

  async guardar(d: DatosEmpresa): Promise<Resultado<void>> {
    const datos = normalizarDatosEmpresa(d);
    const error = validarDatosEmpresa(datos);
    if (error) return { exito: false, mensaje: error };

    try {
      const anterior = await this.db.getById<DatosEmpresa>(COLECCION_CONFIGURACION, ID_DATOS_EMPRESA);
      const final: DatosEmpresa = {
        ...datos,
        actualizado: new Date().toISOString(),
        usuario: this.usuarioSesion.getUsuarioActual()?.email ?? 'Desconocido',
      };
      const escrituras: EscrituraBatch[] = [
        { coleccion: COLECCION_CONFIGURACION, id: ID_DATOS_EMPRESA, modo: 'reemplazar', data: final },
      ];
      await this.logRegistro.agregarAlBatch(
        escrituras, anterior ? 'EDITAR' : 'ALTA', COLECCION_CONFIGURACION, ID_DATOS_EMPRESA,
        `Datos de la empresa — ${final.razonSocial}`,
        anterior,
      );
      await this.db.commitBatch(escrituras);
      this.cache = final;
      return { exito: true, mensaje: 'Datos de la empresa guardados.' };
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', COLECCION_CONFIGURACION, ID_DATOS_EMPRESA, `Error al guardar los datos de la empresa: ${e?.message ?? e}`,
      );
      return { exito: false, mensaje: `No se pudieron guardar: ${e?.message ?? e}` };
    }
  }
}
