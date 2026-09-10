import { Component } from '@angular/core';
import { ChoferMigrationService } from 'src/app/servicios/migracion/chofer-migration.service';
import { ProveedorMigrationService } from 'src/app/servicios/migracion/proveedor-migration.service';
import { ClienteMigrationService } from 'src/app/servicios/migracion/cliente-migration.service';
import { LegajoMigrationService } from 'src/app/servicios/migracion/legajo-migracion.service';
import { TarifaMigrationService, ItemPreviewEventual, ItemHuerfanoEventual, ItemHistorialGeneral } from 'src/app/servicios/migracion/tarifa-migration.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-migracion',
  templateUrl: './migracion.component.html',
  standalone: false,
})
export class MigracionComponent {

  estadoChoferes: string = '';
  estadoVehiculos: string = '';
  estadoCorreccionChoferes: string = '';
  estadoCorreccionVehiculos: string = '';
  ejecutando: boolean = false;
  estadoVerificacionCuits: string = '';
  duplicadosCuits: { cuit: number; choferes: string[] }[] = [];

  estadoProveedores: string = '';
  estadoVehiculosProveedores: string = '';
  estadoClientes: string = '';
  estadoCorreccionClientes: string = '';

  estadoTarifasClientes: string = '';
  estadoTarifasChoferes: string = '';
  estadoTarifasProveedores: string = '';

  estadoBackupLegajos: string = '';
  estadoCatalogoLegajos: string = '';
  estadoMigracionLegajos: string = '';
  estadoVerificacionLegajos: string = '';

  estadoAuditoriaTarifas: string = '';
  resultadoAuditoriaTarifas: { label: string; coleccion: string; cantidad: number }[] = [];
  notasAuditoriaTarifas: string[] = [];

  estadoAuditoriaVehiculos: string = '';
  resultadoAuditoriaVehiculos: { totalVehiculos: number; categoriasValidas: string[] } | null = null;
  vehiculosCategoriaInvalida: { idVehiculo: string; dominio: string; nombreCargado: string; entidad: string }[] = [];

  estadoPreviewEventual: string = '';
  previewEventual: { total: number; resueltos: string[]; noResueltos: { idTarifaVieja: number; motivo: string }[] } | null = null;
  estadoConfirmacionEventual: string = '';
  private itemsEventualParaConfirmar: ItemPreviewEventual[] = [];

  estadoAuditoriaHuerfanosEventual: string = '';
  huerfanosEventual: ItemHuerfanoEventual[] = [];
  private idsHuerfanosEventualParaBorrar: string[] = [];

  estadoVolcadoGeneral: string = '';
  private mapaCategoriasLegajos: Map<string, string> | null = null;
  documentosSinMatchCategoria: { idLegajo: string; idChofer: string; tituloOriginal: string }[] = [];
  documentosFechaRequiereRevision: { idLegajo: string; idChofer: string; titulo: string; fechaVtoOriginal: any }[] = [];

  constructor(
    private choferMigration: ChoferMigrationService,
    private proveedorMigration: ProveedorMigrationService,
    private clienteMigration: ClienteMigrationService,
    private legajoMigration: LegajoMigrationService,
    private tarifaMigration: TarifaMigrationService,
  ) {}

  async migrarProveedores(): Promise<void> {
    this.ejecutando = true;
    this.estadoProveedores = 'Ejecutando migración de proveedores...';
    try {
      await this.proveedorMigration.migrarProveedores();
      this.estadoProveedores = 'Migración completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoProveedores = `Error: ${e.message}`;
      console.error('Error en migración de proveedores:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async migrarVehiculosProveedores(): Promise<void> {
    this.ejecutando = true;
    this.estadoVehiculosProveedores = 'Creando vehículos de proveedores...';
    try {
      await this.proveedorMigration.migrarVehiculosProveedores();
      this.estadoVehiculosProveedores = 'Migración completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoVehiculosProveedores = `Error: ${e.message}`;
      console.error('Error en migración de vehículos de proveedores:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async migrarChoferes(): Promise<void> {
    this.ejecutando = true;
    this.estadoChoferes = 'Ejecutando migración de choferes...';
    try {
      await this.choferMigration.migrarChoferes();
      this.estadoChoferes = 'Migración completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoChoferes = `Error: ${e.message}`;
      console.error('Error en migración de choferes:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async corregirIdChoferes(): Promise<void> {
    this.ejecutando = true;
    this.estadoCorreccionChoferes = 'Eliminando campo idChofer de documentos...';
    try {
      await this.choferMigration.corregirIdChoferes();
      this.estadoCorreccionChoferes = 'Corrección completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoCorreccionChoferes = `Error: ${e.message}`;
      console.error('Error en corrección de choferes:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async corregirIdVehiculos(): Promise<void> {
    this.ejecutando = true;
    this.estadoCorreccionVehiculos = 'Eliminando campo idVehiculo de documentos...';
    try {
      await this.choferMigration.corregirIdVehiculos();
      this.estadoCorreccionVehiculos = 'Corrección completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoCorreccionVehiculos = `Error: ${e.message}`;
      console.error('Error en corrección de vehículos:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async migrarClientes(): Promise<void> {
    this.ejecutando = true;
    this.estadoClientes = 'Ejecutando migración de clientes...';
    try {
      await this.clienteMigration.migrarClientes();
      this.estadoClientes = 'Migración completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoClientes = `Error: ${e.message}`;
      console.error('Error en migración de clientes:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async corregirIdClientes(): Promise<void> {
    this.ejecutando = true;
    this.estadoCorreccionClientes = 'Eliminando campo idCliente de documentos...';
    try {
      await this.clienteMigration.corregirIdClientes();
      this.estadoCorreccionClientes = 'Corrección completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoCorreccionClientes = `Error: ${e.message}`;
      console.error('Error en corrección de clientes:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async migrarTarifasClientes(): Promise<void> {
    this.ejecutando = true;
    this.estadoTarifasClientes = 'Migrando tarifasHabilitadas de clientes...';
    try {
      await this.clienteMigration.migrarTarifasHabilitadas();
      this.estadoTarifasClientes = 'Migración completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoTarifasClientes = `Error: ${e.message}`;
      console.error('Error en migración de tarifasHabilitadas (clientes):', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async migrarTarifasChoferes(): Promise<void> {
    this.ejecutando = true;
    this.estadoTarifasChoferes = 'Migrando tarifasHabilitadas de choferes...';
    try {
      await this.choferMigration.migrarTarifasHabilitadas();
      this.estadoTarifasChoferes = 'Migración completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoTarifasChoferes = `Error: ${e.message}`;
      console.error('Error en migración de tarifasHabilitadas (choferes):', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async migrarTarifasProveedores(): Promise<void> {
    this.ejecutando = true;
    this.estadoTarifasProveedores = 'Migrando tarifasHabilitadas de proveedores...';
    try {
      await this.proveedorMigration.migrarTarifasHabilitadas();
      this.estadoTarifasProveedores = 'Migración completada. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoTarifasProveedores = `Error: ${e.message}`;
      console.error('Error en migración de tarifasHabilitadas (proveedores):', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async verificarCuits(): Promise<void> {
    this.ejecutando = true;
    this.estadoVerificacionCuits = 'Verificando CUITs...';
    this.duplicadosCuits = [];
    try {
      const resultado = await this.choferMigration.verificarCuitsUnicos();
      if (resultado.ok) {
        this.estadoVerificacionCuits = '✅ Todos los CUITs son únicos. Podés proceder con la migración de proveedores.';
      } else {
        this.duplicadosCuits = resultado.duplicados;
        this.estadoVerificacionCuits = `⚠️ Se encontraron ${resultado.duplicados.length} CUITs duplicados. Revisá el detalle abajo y corregílos en Firebase antes de continuar.`;
      }
    } catch (e: any) {
      this.estadoVerificacionCuits = `Error: ${e.message}`;
      console.error('Error en verificación de CUITs:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async backupLegajos(): Promise<void> {
    this.ejecutando = true;
    this.estadoBackupLegajos = 'Generando backup de legajos...';
    try {
      await this.legajoMigration.backupLegajos();
      this.estadoBackupLegajos = 'Backup completado. Revisá la consola para el detalle.';
    } catch (e: any) {
      this.estadoBackupLegajos = `Error: ${e.message}`;
      console.error('Error en backup de legajos:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async crearCatalogoCategoriasLegajos(): Promise<void> {
    this.ejecutando = true;
    this.estadoCatalogoLegajos = 'Creando catálogo de categorías de documentación...';
    try {
      this.mapaCategoriasLegajos = await this.legajoMigration.crearCatalogoCategorias();
      this.estadoCatalogoLegajos = `Catálogo listo (${this.mapaCategoriasLegajos.size} categorías). Revisá la consola para el detalle.`;
    } catch (e: any) {
      this.estadoCatalogoLegajos = `Error: ${e.message}`;
      console.error('Error creando catálogo de categorías:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async migrarLegajosDocumentacion(): Promise<void> {
    if (!this.mapaCategoriasLegajos) {
      this.estadoMigracionLegajos = 'Primero hay que crear el catálogo de categorías (paso anterior).';
      return;
    }
    this.ejecutando = true;
    this.estadoMigracionLegajos = 'Migrando documentación de legajos...';
    this.documentosSinMatchCategoria = [];
    this.documentosFechaRequiereRevision = [];
    try {
      const resultado = await this.legajoMigration.migrarLegajos(this.mapaCategoriasLegajos);
      this.documentosSinMatchCategoria = resultado.documentosSinMatchCategoria;
      this.documentosFechaRequiereRevision = resultado.documentosFechaRequiereRevision;
      this.estadoMigracionLegajos =
        `Migración completada: ${resultado.legajosMigrados}/${resultado.totalLegajos} legajos. ` +
        (resultado.documentosSinMatchCategoria.length > 0 || resultado.documentosFechaRequiereRevision.length > 0
          ? 'Hay casos que requieren revisión manual — ver el detalle abajo.'
          : 'Sin casos pendientes de revisión.');
    } catch (e: any) {
      this.estadoMigracionLegajos = `Error: ${e.message}`;
      console.error('Error en migración de legajos:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async verificarCantidadLegajos(): Promise<void> {
    this.ejecutando = true;
    this.estadoVerificacionLegajos = 'Verificando cantidad de documentos...';
    try {
      const resultado = await this.legajoMigration.verificarCantidad();
      this.estadoVerificacionLegajos = resultado.coinciden
        ? `✅ Coinciden: backup ${resultado.antes} = legajos actual ${resultado.despues}.`
        : `⚠️ NO coinciden: backup ${resultado.antes} vs. legajos actual ${resultado.despues}.`;
    } catch (e: any) {
      this.estadoVerificacionLegajos = `Error: ${e.message}`;
      console.error('Error en verificación de cantidad de legajos:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async auditarTarifasViejas(): Promise<void> {
    this.ejecutando = true;
    this.estadoAuditoriaTarifas = 'Auditando colecciones de tarifas viejas...';
    this.resultadoAuditoriaTarifas = [];
    this.notasAuditoriaTarifas = [];
    try {
      const { resultado, notas } = await this.tarifaMigration.auditarTarifasViejas();
      this.resultadoAuditoriaTarifas = resultado;
      this.notasAuditoriaTarifas = notas;
      this.estadoAuditoriaTarifas = 'Auditoría completada. Revisá el detalle abajo (y la consola).';
      console.log('Auditoría de tarifas viejas', resultado, notas);
    } catch (e: any) {
      this.estadoAuditoriaTarifas = `Error: ${e.message}`;
      console.error('Error en auditoría de tarifas:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async auditarCategoriasVehiculo(): Promise<void> {
    this.ejecutando = true;
    this.estadoAuditoriaVehiculos = 'Auditando categoría de vehículos...';
    this.resultadoAuditoriaVehiculos = null;
    this.vehiculosCategoriaInvalida = [];
    try {
      const resultado = await this.tarifaMigration.auditarCategoriasVehiculo();
      this.resultadoAuditoriaVehiculos = {
        totalVehiculos: resultado.totalVehiculos,
        categoriasValidas: resultado.categoriasValidas,
      };
      this.vehiculosCategoriaInvalida = resultado.vehiculosInvalidos;
      this.estadoAuditoriaVehiculos = resultado.vehiculosInvalidos.length === 0
        ? `✅ Los ${resultado.totalVehiculos} vehículos tienen categoría válida (${resultado.categoriasValidas.join(', ')}).`
        : `⚠️ ${resultado.vehiculosInvalidos.length} de ${resultado.totalVehiculos} vehículos tienen categoría inválida o vacía. Revisá el detalle abajo.`;
      console.log('Auditoría de categorías de vehículo', resultado);
    } catch (e: any) {
      this.estadoAuditoriaVehiculos = `Error: ${e.message}`;
      console.error('Error en auditoría de categorías de vehículo:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async previsualizarMigracionEventual(): Promise<void> {
    this.ejecutando = true;
    this.estadoPreviewEventual = 'Armando previsualización de migración de Eventual...';
    this.previewEventual = null;
    this.estadoConfirmacionEventual = '';
    this.itemsEventualParaConfirmar = [];
    try {
      const resultado = await this.tarifaMigration.previsualizarMigracionEventual();
      this.itemsEventualParaConfirmar = resultado.resueltos;
      this.previewEventual = {
        total: resultado.total,
        resueltos: resultado.resueltos.map(r => r.resumen),
        noResueltos: resultado.noResueltos,
      };
      this.estadoPreviewEventual = `Previsualización lista: ${resultado.resueltos.length} de ${resultado.total} se pueden migrar. ${resultado.noResueltos.length} quedaron sin resolver (ver detalle abajo).`;
      console.log('Previsualización migración Eventual', resultado);
    } catch (e: any) {
      this.estadoPreviewEventual = `Error: ${e.message}`;
      console.error('Error en previsualización de migración Eventual:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async confirmarMigracionEventual(): Promise<void> {
    if (this.itemsEventualParaConfirmar.length === 0) {
      this.estadoConfirmacionEventual = 'No hay ítems previsualizados para migrar — corré primero "Previsualizar".';
      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Confirmás la migración?',
      text: `Se van a crear ${this.itemsEventualParaConfirmar.length} registros en registrosOpEventuales. Esta acción no se puede deshacer, y volver a correrla duplica los registros.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, migrar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.ejecutando = true;
    this.estadoConfirmacionEventual = 'Migrando...';
    try {
      const resultado = await this.tarifaMigration.confirmarMigracionEventual(this.itemsEventualParaConfirmar);
      this.estadoConfirmacionEventual = resultado.errores.length === 0
        ? `✅ Se crearon ${resultado.creados} registros correctamente.`
        : `⚠️ Se crearon ${resultado.creados} registros, ${resultado.errores.length} con error (ver consola).`;
      if (resultado.errores.length > 0) {
        console.error('Errores en confirmación de migración Eventual', resultado.errores);
      }
      this.itemsEventualParaConfirmar = [];
    } catch (e: any) {
      this.estadoConfirmacionEventual = `Error: ${e.message}`;
      console.error('Error en confirmación de migración Eventual:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async auditarRegistrosOpEventualesHuerfanos(): Promise<void> {
    this.ejecutando = true;
    this.estadoAuditoriaHuerfanosEventual = 'Auditando registrosOpEventuales...';
    this.huerfanosEventual = [];
    this.idsHuerfanosEventualParaBorrar = [];
    try {
      const resultado = await this.tarifaMigration.auditarRegistrosOpEventualesHuerfanos();
      this.huerfanosEventual = resultado.huerfanos;
      this.idsHuerfanosEventualParaBorrar = resultado.huerfanos.map(h => h.id);
      this.estadoAuditoriaHuerfanosEventual = `Total registrosOpEventuales: ${resultado.total} — huérfanos (de pruebas): ${resultado.huerfanos.length}.`;
      console.log('Auditoría de registrosOpEventuales huérfanos', resultado);
    } catch (e: any) {
      this.estadoAuditoriaHuerfanosEventual = `Error: ${e.message}`;
      console.error('Error en auditoría de registrosOpEventuales huérfanos:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async borrarRegistrosOpEventualesHuerfanos(): Promise<void> {
    if (this.idsHuerfanosEventualParaBorrar.length === 0) {
      this.estadoAuditoriaHuerfanosEventual = 'No hay huérfanos para borrar — corré primero la auditoría.';
      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Borrar registrosOpEventuales huérfanos?',
      text: `Se van a borrar ${this.idsHuerfanosEventualParaBorrar.length} documento(s). Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.ejecutando = true;
    this.estadoAuditoriaHuerfanosEventual = 'Borrando...';
    try {
      await this.tarifaMigration.borrarRegistrosOpEventualesHuerfanos(this.idsHuerfanosEventualParaBorrar);
      this.estadoAuditoriaHuerfanosEventual = `✅ ${this.idsHuerfanosEventualParaBorrar.length} documento(s) borrado(s) correctamente.`;
      this.huerfanosEventual = [];
      this.idsHuerfanosEventualParaBorrar = [];
    } catch (e: any) {
      this.estadoAuditoriaHuerfanosEventual = `Error: ${e.message}`;
      console.error('Error al borrar registrosOpEventuales huérfanos:', e);
    } finally {
      this.ejecutando = false;
    }
  }

  async volcarHistorialGeneral(): Promise<void> {
    this.ejecutando = true;
    this.estadoVolcadoGeneral = 'Volcando historial de Tarifa General...';
    try {
      const items = await this.tarifaMigration.volcarHistorialGeneral();
      const porLado = { cliente: 0, chofer: 0, proveedor: 0 };
      items.forEach(i => porLado[i.lado]++);
      this.estadoVolcadoGeneral =
        `Listo — revisá la consola. ${items.length} documentos ` +
        `(cliente: ${porLado.cliente}, chofer: ${porLado.chofer}, proveedor: ${porLado.proveedor}), ordenados por fecha.`;
      console.log('Historial de Tarifa General (viejo, ordenado por fecha)', items);
    } catch (e: any) {
      this.estadoVolcadoGeneral = `Error: ${e.message}`;
      console.error('Error en volcado de historial de Tarifa General:', e);
    } finally {
      this.ejecutando = false;
    }
  }
}
