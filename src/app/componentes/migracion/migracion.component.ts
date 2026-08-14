import { Component } from '@angular/core';
import { ChoferMigrationService } from 'src/app/servicios/migracion/chofer-migration.service';
import { ProveedorMigrationService } from 'src/app/servicios/migracion/proveedor-migration.service';
import { ClienteMigrationService } from 'src/app/servicios/migracion/cliente-migration.service';
import { LegajoMigrationService } from 'src/app/servicios/migracion/legajo-migracion.service';

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
  private mapaCategoriasLegajos: Map<string, string> | null = null;
  documentosSinMatchCategoria: { idLegajo: string; idChofer: string; tituloOriginal: string }[] = [];
  documentosFechaRequiereRevision: { idLegajo: string; idChofer: string; titulo: string; fechaVtoOriginal: any }[] = [];

  constructor(
    private choferMigration: ChoferMigrationService,
    private proveedorMigration: ProveedorMigrationService,
    private clienteMigration: ClienteMigrationService,
    private legajoMigration: LegajoMigrationService,
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
}
