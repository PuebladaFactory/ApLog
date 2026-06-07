import { Component } from '@angular/core';
import { ChoferMigrationService } from 'src/app/servicios/migracion/chofer-migration.service';
import { ProveedorMigrationService } from 'src/app/servicios/migracion/proveedor-migration.service';
import { ClienteMigrationService } from 'src/app/servicios/migracion/cliente-migration.service';

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

  constructor(
    private choferMigration: ChoferMigrationService,
    private proveedorMigration: ProveedorMigrationService,
    private clienteMigration: ClienteMigrationService,
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
}
