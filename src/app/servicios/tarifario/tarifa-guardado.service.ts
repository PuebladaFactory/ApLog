import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { ConIdType } from 'src/app/interfaces/conId';
import { Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { TarifaFactoryService, TarifaFormData } from 'src/app/servicios/tarifario/tarifa-factory.service';
import { TarifaEspecialFactoryService, TarifaEspecialFormData } from 'src/app/servicios/tarifario/tarifa-especial-factory.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

/**
 * Punto único de persistencia para Tarifa/TarifaEspecial.
 *
 * Implementa "editor emite / padre persiste": tarifa-form, tarifa-aumento,
 * tarifa-especial-form y tarifa-especial-aumento arman el FormData
 * correspondiente y lo emiten vía (guardar) — no persisten nada ellos mismos.
 * Los 3 padres (tarifas-general/personalizada/especial) llaman a este
 * servicio, que arma el objeto final vía factory, llama a TarifarioService y
 * centraliza el try/catch + Swal de éxito/error, así esa lógica no se repite
 * en cada padre.
 */
@Injectable({ providedIn: 'root' })
export class TarifaGuardadoService {
  constructor(
    private tarifarioService: TarifarioService,
    private tarifaFactory: TarifaFactoryService,
    private tarifaEspecialFactory: TarifaEspecialFactoryService,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  async guardarTarifa(
    formData: TarifaFormData,
    tarifaAnterior: ConIdType<Tarifa> | null,
    mensajeExito: string = 'Tarifa guardada',
  ): Promise<boolean> {
    try {
      const objetoTarifa = tarifaAnterior
        ? this.tarifaFactory.nuevaVersion(tarifaAnterior, formData)
        : this.tarifaFactory.crearTarifa(formData);

      if (tarifaAnterior) {
        await this.tarifarioService.nuevaVersionTarifa(tarifaAnterior.idTarifa, objetoTarifa);
      } else {
        await this.tarifarioService.crearTarifa(objetoTarifa);
      }

      Swal.fire('Confirmado', mensajeExito, 'success');
      return true;
    } catch (e: any) {
      Swal.fire('Error', `Error al guardar: ${e.message}`, 'error');
      return false;
    }
  }

  async guardarTarifaEspecial(
    formData: TarifaEspecialFormData,
    tarifaAnterior: ConIdType<TarifaEspecial> | null,
    mensajeExito: string = 'Tarifa especial guardada',
  ): Promise<boolean> {
    try {
      const objetoTarifa = tarifaAnterior
        ? this.tarifaEspecialFactory.nuevaVersion(tarifaAnterior, formData)
        : this.tarifaEspecialFactory.crearTarifaEspecial(formData);

      if (tarifaAnterior) {
        await this.tarifarioService.nuevaVersionTarifaEspecial(tarifaAnterior.idTarifa, objetoTarifa);
      } else {
        await this.tarifarioService.crearTarifaEspecial(objetoTarifa);
      }

      Swal.fire('Confirmado', mensajeExito, 'success');
      return true;
    } catch (e: any) {
      Swal.fire('Error', `Error al guardar: ${e.message}`, 'error');
      return false;
    }
  }

  /** Baja definitiva sin reemplazo — la confirmación ("estás seguro, es
   *  irreversible") vive en el componente que dispara la acción, mismo
   *  criterio que onCancelar()/quitarSección() en los forms: acá solo se
   *  centraliza la persistencia + el Swal de resultado, igual que en
   *  guardarTarifa/guardarTarifaEspecial. */
  async darDeBajaTarifa(tarifa: ConIdType<Tarifa>): Promise<boolean> {
    const usuario = this.usuarioSesion.getUsuarioActual();
    try {
      await this.tarifarioService.darDeBajaTarifa(tarifa.idTarifa, usuario?.email || 'Desconocido');
      Swal.fire('Confirmado', 'Tarifa dada de baja', 'success');
      return true;
    } catch (e: any) {
      Swal.fire('Error', `Error al dar de baja: ${e.message}`, 'error');
      return false;
    }
  }

  async darDeBajaTarifaEspecial(tarifa: ConIdType<TarifaEspecial>): Promise<boolean> {
    const usuario = this.usuarioSesion.getUsuarioActual();
    try {
      await this.tarifarioService.darDeBajaTarifaEspecial(tarifa.idTarifa, usuario?.email || 'Desconocido');
      Swal.fire('Confirmado', 'Tarifa especial dada de baja', 'success');
      return true;
    } catch (e: any) {
      Swal.fire('Error', `Error al dar de baja: ${e.message}`, 'error');
      return false;
    }
  }
}
