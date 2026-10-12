````
INSTRUCCIÓN TC-R3 — Tarifas (cierre): componentes shared viejos y estado viejo de HomeComponent/StorageService
=============================================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC-R3" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Después de TC-R1/TC-R2 quedaron huérfanas las piezas compartidas del
sistema viejo de tarifas:

1. 4 componentes shared declarados y exportados en SharedModule, sin ruta,
   sin selector usado y sin import fuera de SharedModule:
   ConsolaTarifaComponent, HistorialTarifasGralComponent,
   TarifasEventualesComponent y TarigaGralEdicionComponent.
2. HomeComponent abre al iniciar la app 7 listeners en tiempo real
   (StorageService.listenForChanges) sobre las colecciones viejas
   tarifasGralCliente, tarifasEspCliente, tarifasPersCliente,
   tarifasGralChofer, tarifasEspChofer, tarifasGralProveedor y
   tarifasEspProveedor: lecturas de Firestore en cada sesión para datos que
   ya nadie muestra. Además declara `tarifas$` sin uso.
3. StorageService tiene 33 BehaviorSubject del sistema viejo de tarifas
   (historiales, "ult" tarifas, consolaTarifa, modoTarifa, opTarifa*,
   tEspecialCliente, erroresTarifas, las 7 colecciones viejas,
   tarifasEventuales, todasTarifasEspCliente…), con sus `case` en setInfo y
   en getObservable. Verificado: fuera de StorageService, solo los usaban
   los componentes ya borrados en TC-R1/TC-R2 y los 4 de este bloque.

Qué queda a propósito (TC-R4):
- EditarInfOpComponent y BuscarTarifaService (código muerto, sin quien los
  abra/inyecte) leen `storageService.loadInfo('tarifasGralCliente'…)`.
  loadInfo lee localStorage directo: sigue compilando y funcionando igual;
  simplemente esas claves ya no se refrescan. Se borran en TC-R4 junto con
  las interfaces viejas (TarifaGralCliente, TarifaPersonalizadaCliente…).
- StorageService.controlLog conserva sus `case "tarifas…":` (política de
  log de escrituras genéricas; no se toca acá).
- Las colecciones viejas en Firestore no se tocan (T12).

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Borrado: SOLO las 4 carpetas del PASO 4, con borrado común (sin `git rm`,
  sin commit).
- Ojo con los espacios al final de línea: muchas líneas de
  storage.service.ts (y `HistorialTarifasGralComponent, ` en los exports de
  shared.module.ts) los tienen, y los BUSCAR los incluyen tal cual. Si
  alguno no matchea solo por eso, matcheá ignorando espacios al final de
  línea, verificá que siga habiendo UNA sola coincidencia, y reportalo.
- Los BUSCAR del PASO 3 están pensados para aplicarse en orden; cada uno
  termina en la primera línea que se conserva (que el REEMPLAZAR repite).
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 `grep -rln "ConsolaTarifaComponent\|HistorialTarifasGralComponent\|TarifasEventualesComponent\|TarigaGralEdicionComponent\|<app-consola-tarifa\|<app-historial-tarifas-gral\|<app-tarifas-eventuales\|<app-tariga-gral-edicion" src/`
    → SOLO shared.module.ts y archivos dentro de las 4 carpetas a borrar.
0.2 `grep -rnE "\.(historialTarifas|historialTarifasClientes|historialTarifasProveedores|erroresTarifas|tarifaChoferHistorial|tarifaClienteHistorial|tarifaProveedorHistorial|ultTarifa[A-Za-z]+|tEspecialCliente|consolaTarifa|modoTarifa|opTarEve|opTarPers|historialTarifa[A-Za-z]+|tarifasEventuales|tarifas(Gral|Esp|Pers)(Cliente|Chofer|Proveedor)|todasTarifasEspCliente)\\$" src/`
    → SOLO storage.service.ts y archivos de las 4 carpetas a borrar
    (incluí .spec.ts y .html en la revisión).
0.3 `grep -rnE "setInfo\(\s*['\"](tarifas(Chofer|Cliente|Proveedor|Eventuales|Gral|Esp|Pers)|ultTarifa|consolaTarifa|modoTarifa|opTarifa|historialTarifa|erroresTarifas|tEspecialCliente|todasTarifas|tarifa(Chofer|Cliente|Proveedor)Historial)" src/`
    → solo dentro de las 4 carpetas a borrar (o sin resultados).
0.4 `grep -rn "getObservable(" src/` → solo storage.service.ts (la
    definición y su uso interno en listenForChanges).
0.5 `grep -rn "listenForChanges" src/ --include=*.ts` → fuera de
    storage.service.ts: home.component.ts (los 7 de tarifas + el
    listenForChangesField de noOperativo) y proforma.component.ts
    ('proforma', no se toca).
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/shared/shared.module.ts

1.1 BUSCAR:
```
import { AccionGenericaComponent } from './botones/accion-generica/accion-generica.component';
import { ConsolaTarifaComponent } from './consola-tarifa/consola-tarifa.component';
```
REEMPLAZAR:
```
import { AccionGenericaComponent } from './botones/accion-generica/accion-generica.component';
```

1.2 BUSCAR:
```
import { HistorialTarifasGralComponent } from './modales/historial-tarifas-gral/historial-tarifas-gral.component';
import { TarifasEventualesComponent } from './tarifas-eventuales/tarifas-eventuales.component';
import { CarruselComponent, SafeUrlPipe } from './carrusel/carrusel.component';
```
REEMPLAZAR:
```
import { CarruselComponent, SafeUrlPipe } from './carrusel/carrusel.component';
```

1.3 BUSCAR:
```
import { TarigaGralEdicionComponent } from './modales/tariga-gral-edicion/tariga-gral-edicion.component';
import { RoleDirective } from './directives/role.directive';
```
REEMPLAZAR:
```
import { RoleDirective } from './directives/role.directive';
```

1.4 BUSCAR:
```
    ConsolaTarifaComponent,
    TableroCalendarioComponent,
    HistorialTarifasGralComponent,
    TarifasEventualesComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    EtiquetaNivelTarifaPipe,
    ClaseNivelTarifaPipe,

    SoloLetrasDirective,

    TarigaGralEdicionComponent,
    RoleDirective, PermisoDirective, BajaObjetoComponent,
```
REEMPLAZAR:
```
    TableroCalendarioComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    EtiquetaNivelTarifaPipe,
    ClaseNivelTarifaPipe,

    SoloLetrasDirective,

    RoleDirective, PermisoDirective, BajaObjetoComponent,
```

1.5 BUSCAR:
```
    ConsolaTarifaComponent,
    TableroCalendarioComponent,
    HistorialTarifasGralComponent, 
    TarifasEventualesComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    EtiquetaNivelTarifaPipe,
    ClaseNivelTarifaPipe,

    SoloLetrasDirective,

    TarigaGralEdicionComponent,
    RoleDirective,
    PermisoDirective,
```
REEMPLAZAR:
```
    TableroCalendarioComponent,
    CarruselComponent,
    SafeUrlPipe,
    CuitFormatDirective,
    SoloNumerosDirective,
    FormatearValorPipe,
    EtiquetaNivelTarifaPipe,
    ClaseNivelTarifaPipe,

    SoloLetrasDirective,

    RoleDirective,
    PermisoDirective,
```

## PASO 2 — src/app/raiz/home/home.component.ts

2.1 BUSCAR:
```
import { Observable, Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
```
REEMPLAZAR:
```
import { Subject, takeUntil } from 'rxjs';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
```

2.2 BUSCAR:
```
  activo!:boolean;
  tarifas$!: Observable<any>;
```
REEMPLAZAR:
```
  activo!:boolean;
```

2.3 BUSCAR:
```
      //this.storageService.listenForChanges<Cliente>("clientes");
      //this.storageService.listenForChanges<Chofer>("choferes");
      //this.storageService.listenForChanges<Chofer>("proveedores");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralCliente");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspCliente");
      this.storageService.listenForChanges<TarifaPersonalizadaCliente>('tarifasPersCliente');
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralChofer");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspChofer");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralProveedor");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspProveedor");
      this.storageService.listenForChangesField<NoDisponibilidadChofer>("noOperativo", "activa", true);
```
REEMPLAZAR:
```
      // TC-R3: fuera los listeners de las 7 colecciones de tarifas viejas
      // (tarifasGral/Esp/PersCliente, tarifasGral/EspChofer,
      // tarifasGral/EspProveedor) — sin lectores desde TC-R1/TC-R2. Las
      // tarifas se cargan con tarifarioService.init().
      this.storageService.listenForChangesField<NoDisponibilidadChofer>("noOperativo", "activa", true);
```

## PASO 3 — src/app/servicios/storage/storage.service.ts

3.1 BUSCAR:
```
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { LogService } from '../log/log.service';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
```
REEMPLAZAR:
```
import { LogService } from '../log/log.service';
```

3.2 BUSCAR:
```
  private _historialTarifas$ = new BehaviorSubject<any>(this.loadInfo('tarifasChofer') || []);
  public historialTarifas$ = this._historialTarifas$.asObservable()

  private _historialTarifasClientes$ = new BehaviorSubject<any>(this.loadInfo('tarifasCliente') || []);
  public historialTarifasClientes$ = this._historialTarifasClientes$.asObservable()

  private _historialTarifasProveedores$ = new BehaviorSubject<any>(this.loadInfo('tarifasProveedor') || []);
  public historialTarifasProveedores$ = this._historialTarifasProveedores$.asObservable();

  private _legajos$ = new BehaviorSubject(this.loadInfo('legajos') || []);
```
REEMPLAZAR:
```
  private _legajos$ = new BehaviorSubject(this.loadInfo('legajos') || []);
```

3.3 BUSCAR:
```
  private _erroresTarifas$ = new BehaviorSubject<any>(this.loadInfo('erroresTarifas') || []);
  public erroresTarifas$ = this._erroresTarifas$.asObservable();

  private _facOpLiqChofer$ = new BehaviorSubject<any>(this.loadInfo('facOpLiqChofer') || []);
```
REEMPLAZAR:
```
  private _facOpLiqChofer$ = new BehaviorSubject<any>(this.loadInfo('facOpLiqChofer') || []);
```

3.4 BUSCAR:
```
  private _tarifaChoferHistorial$ = new BehaviorSubject<any>(this.loadInfo('tarifaChoferHistorial') || []);
  public tarifaChoferHistorial$ = this._tarifaChoferHistorial$.asObservable();

  private _tarifaClienteHistorial$ = new BehaviorSubject<any>(this.loadInfo('tarifaClienteHistorial') || []);
  public tarifaClienteHistorial$ = this._tarifaClienteHistorial$.asObservable();

  private _tarifaProveedorHistorial$ = new BehaviorSubject<any>(this.loadInfo('tarifaProveedorHistorial') || []);
  public tarifaProveedorHistorial$ = this._tarifaProveedorHistorial$.asObservable();
  
  private _ultTarifaGralCliente$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaGralCliente') || []);
  public ultTarifaGralCliente$ = this._ultTarifaGralCliente$.asObservable();

  private _ultTarifaEspCliente$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaEspCliente') || []);
  public ultTarifaEspCliente$ = this._ultTarifaEspCliente$.asObservable();

  private _ultTarifaPersCliente$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaPersCliente') || []);
  public ultTarifaPersCliente$ = this._ultTarifaPersCliente$.asObservable();

  private _ultTarifaGralChofer$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaGralChofer') || []);
  public ultTarifaGralChofer$ = this._ultTarifaGralChofer$.asObservable();

  private _ultTarifaEspChofer$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaEspChofer') || []);
  public ultTarifaEspChofer$ = this._ultTarifaEspChofer$.asObservable();

  private _ultTarifaPersChofer$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaPersChofer') || []);
  public ultTarifaPersChofer$ = this._ultTarifaPersChofer$.asObservable();

  private _ultTarifaGralProveedor$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaGralProveedor') || []);
  public ultTarifaGralProveedor$ = this._ultTarifaGralProveedor$.asObservable();

  private _ultTarifaEspProveedor$ = new BehaviorSubject<any>(this.loadInfo('ultTarifaEspProveedor') || []);
  public ultTarifaEspProveedor$ = this._ultTarifaEspProveedor$.asObservable();

  private _clienteSeleccionado$ = new BehaviorSubject<any>(this.loadInfo('clienteSeleccionado') || []);
```
REEMPLAZAR:
```
  private _clienteSeleccionado$ = new BehaviorSubject<any>(this.loadInfo('clienteSeleccionado') || []);
```

3.5 BUSCAR:
```
  private _tEspecialCliente$ = new BehaviorSubject<any>(this.loadInfo('tEspecialCliente') || []);
  public tEspecialCliente$ = this._tEspecialCliente$.asObservable();

  private _consolaTarifa$ = new BehaviorSubject<any>(this.loadInfo('consolaTarifa') || []);
  public consolaTarifa$ = this._consolaTarifa$.asObservable();

  private _modoTarifa$ = new BehaviorSubject<any>(this.loadInfo('modoTarifa') || []);
  public modoTarifa$ = this._modoTarifa$.asObservable();

  private _opTarEve$ = new BehaviorSubject<any>(this.loadInfo('opTarifaEventual') || []);
  public opTarEve$ = this._opTarEve$.asObservable();

  private _opTarPers$ = new BehaviorSubject<any>(this.loadInfo('opTarifaPersonalizada') || []);
  public opTarPers$ = this._opTarPers$.asObservable();
  
  private _vehiculosChofer$ = new BehaviorSubject<any>(this.loadInfo('vehiculosChofer') || []);
```
REEMPLAZAR:
```
  private _vehiculosChofer$ = new BehaviorSubject<any>(this.loadInfo('vehiculosChofer') || []);
```

3.6 BUSCAR:
```
  private _historialTarifaGralCliente$ = new BehaviorSubject<any>(this.loadInfo('historialTarifaGralCliente') || []);
  public historialTarifaGralCliente$ = this._historialTarifaGralCliente$.asObservable();

  private _historialTarifaGralChofer$ = new BehaviorSubject<any>(this.loadInfo('historialTarifaGralChofer') || []);
  public historialTarifaGralChofer$ = this._historialTarifaGralChofer$.asObservable();

  private _historialTarifaGralProveedor$ = new BehaviorSubject<any>(this.loadInfo('historialTarifaGralProveedor') || []);
  public historialTarifaGralProveedor$ = this._historialTarifaGralProveedor$.asObservable();

  private _historialTarifaPersCliente$ = new BehaviorSubject<any>(this.loadInfo('historialTarifaPersCliente') || []);
  public historialTarifaPersCliente$ = this._historialTarifaPersCliente$.asObservable();

  private _tarifasEventuales$ = new BehaviorSubject<any>(this.loadInfo('tarifasEventuales') || []);
  public tarifasEventuales$ = this._tarifasEventuales$.asObservable();
  
  private _tarifasGralCliente$ = new BehaviorSubject<any>(this.loadInfo('tarifasGralCliente') || []);
  public tarifasGralCliente$ = this._tarifasGralCliente$.asObservable();

  private _tarifasEspCliente$ = new BehaviorSubject<any>(this.loadInfo('tarifasEspCliente') || []);
  public tarifasEspCliente$ = this._tarifasEspCliente$.asObservable();

  private _tarifasPersCliente$ = new BehaviorSubject<any>(this.loadInfo('tarifasPersCliente') || []);
  public tarifasPersCliente$ = this._tarifasPersCliente$.asObservable();
  
  private _tarifasGralChofer$ = new BehaviorSubject<any>(this.loadInfo('tarifasGralChofer') || []);
  public tarifasGralChofer$ = this._tarifasGralChofer$.asObservable();
  
  private _tarifasEspChofer$ = new BehaviorSubject<any>(this.loadInfo('tarifasEspChofer') || []);
  public tarifasEspChofer$ = this._tarifasEspChofer$.asObservable();

  private _tarifasGralProveedor$ = new BehaviorSubject<any>(this.loadInfo('tarifasGralProveedor') || []);
  public tarifasGralProveedor$ = this._tarifasGralProveedor$.asObservable();
  
  private _tarifasEspProveedor$ = new BehaviorSubject<any>(this.loadInfo('tarifasEspProveedor') || []);
  public tarifasEspProveedor$ = this._tarifasEspProveedor$.asObservable();

  private _users$ = new BehaviorSubject<any>(this.loadInfo('users') || [] || null);
```
REEMPLAZAR:
```
  private _users$ = new BehaviorSubject<any>(this.loadInfo('users') || [] || null);
```

3.7 BUSCAR:
```
  private _todasTarifasEspCliente$ = new BehaviorSubject<any>(this.loadInfo('todasTarifasEspCliente') || []);
  public todasTarifasEspCliente$ = this._todasTarifasEspCliente$.asObservable()

  private _ruta$ = new BehaviorSubject<any>(this.loadInfo('ruta') || []);
```
REEMPLAZAR:
```
  private _ruta$ = new BehaviorSubject<any>(this.loadInfo('ruta') || []);
```

3.8 BUSCAR:
```
      case "tarifasChofer": {
        this._historialTarifas$.next(data)
        break;
      }

      case "tarifasCliente": {
        this._historialTarifasClientes$.next(data)
        break;
      }

      case "tarifasProveedor": {
        this._historialTarifasProveedores$.next(data)
        break;
      }

      case "legajos": {
```
REEMPLAZAR:
```
      case "legajos": {
```

3.9 BUSCAR:
```
      case "erroresTarifas": {
        this._erroresTarifas$.next(data)
        break;
      }

      case "facOpLiqChofer":{
```
REEMPLAZAR:
```
      case "facOpLiqChofer":{
```

3.10 BUSCAR:
```
      case "tarifaChoferHistorial":{
        this._tarifaChoferHistorial$.next(data)
        break;
      }

      case "tarifaClienteHistorial":{
        this._tarifaClienteHistorial$.next(data)
        break;
      }

      case "tarifaProveedorHistorial":{
        this._tarifaProveedorHistorial$.next(data)
        break;
      }

      case "ultTarifaGralCliente":{
        this._ultTarifaGralCliente$.next(data)
        break;
      }

      case "ultTarifaEspCliente":{
        this._ultTarifaEspCliente$.next(data)
        break;
      }

      case "ultTarifaGralChofer":{
        this._ultTarifaGralChofer$.next(data)
        break;
      }

      case "ultTarifaEspChofer":{
        this._ultTarifaEspChofer$.next(data)
        break;
      }

      case "ultTarifaPersCliente":{
        this._ultTarifaPersCliente$.next(data)
        break;
      }

      case "ultTarifaPersChofer":{
        this._ultTarifaPersChofer$.next(data)
        break;
      }

      case "ultTarifaGralProveedor":{
        this._ultTarifaGralProveedor$.next(data)
        break;
      }

      case "ultTarifaEspProveedor":{
        this._ultTarifaEspProveedor$.next(data)
        break;
      }
      
      case "clienteSeleccionado":{
```
REEMPLAZAR:
```
      case "clienteSeleccionado":{
```

3.11 BUSCAR:
```
      case "tEspecialCliente": {
        this._tEspecialCliente$.next(data)
        break;
      }

      case "consolaTarifa": {
        this._consolaTarifa$.next(data)
        break;
      }

      case "modoTarifa": {
        this._modoTarifa$.next(data)
        break;
      }

      case "opTarifaEventual": {
        this._opTarEve$.next(data);
        break
      }

      case "opTarifaPersonalizada": {
        this._opTarPers$.next(data);
        break
      }

      case "vehiculosChofer":{
```
REEMPLAZAR:
```
      case "vehiculosChofer":{
```

3.12 BUSCAR:
```
      case "historialTarifaGralCliente":{
        this._historialTarifaGralCliente$.next(data);
        break
      }

      case "historialTarifaGralChofer":{
        this._historialTarifaGralChofer$.next(data);
        break
      }

      case "historialTarifaGralProveedor":{
        this._historialTarifaGralProveedor$.next(data);
        break
      }
      
      case "historialTarifaPersCliente":{
        this._historialTarifaPersCliente$.next(data);
        break
      }

      case "tarifasEventuales":{
        this._tarifasEventuales$.next(data);
        break
      }

      case "tarifasGralCliente":{
        this._tarifasGralCliente$.next(data);
        break
      }

      case "tarifasEspCliente":{
        this._tarifasEspCliente$.next(data);
        break
      }

      case "tarifasPersCliente":{
        this._tarifasPersCliente$.next(data);
        break
      }

      case "tarifasGralChofer":{
        this._tarifasGralChofer$.next(data);
        break
      }      
      
      case "tarifasEspChofer":{
        this._tarifasEspChofer$.next(data);
        break
      }  

      case "tarifasGralProveedor":{
        this._tarifasGralProveedor$.next(data);
        break
      }      
      
      case "tarifasEspProveedor":{
        this._tarifasEspProveedor$.next(data);
        break
      } 

      case "users":{
```
REEMPLAZAR:
```
      case "users":{
```

3.13 BUSCAR:
```
      case "todasTarifasEspCliente":{
        this._todasTarifasEspCliente$.next(data);
        break
      }

      case "facturaCliente":{
```
REEMPLAZAR:
```
      case "facturaCliente":{
```

3.14 BUSCAR:
```
      case 'tarifasGralCliente':
        return this._tarifasGralCliente$.asObservable();      
      case 'tarifasEspCliente':
        return this._tarifasEspCliente$.asObservable();      
      case 'tarifasPersCliente':
        return this._tarifasPersCliente$.asObservable();  
      case 'tarifasGralChofer':
        return this._tarifasGralChofer$.asObservable();
      case 'tarifasEspChofer':
        return this._tarifasEspChofer$.asObservable();  
      case 'tarifasGralProveedor':
        return this._tarifasGralProveedor$.asObservable();
      case 'tarifasEspProveedor':
        return this._tarifasEspProveedor$.asObservable();            
      case 'users':
```
REEMPLAZAR:
```
      case 'users':
```

3.15 BUSCAR:
```
      case 'todasTarifasEspCliente':
        return this._todasTarifasEspCliente$.asObservable(); 
      case 'ruta':
```
REEMPLAZAR:
```
      case 'ruta':
```

3.16 BUSCAR:
```
      case "tarifasEventuales":
        return this._tarifasEventuales$.asObservable();      
      case "facturaOpCliente":
```
REEMPLAZAR:
```
      case "facturaOpCliente":
```

## PASO 4 — Borrar (carpetas completas, con todo su contenido)

- src/app/shared/consola-tarifa/
- src/app/shared/modales/historial-tarifas-gral/
- src/app/shared/tarifas-eventuales/
- src/app/shared/modales/tariga-gral-edicion/

Antes de borrar, listá el contenido de cada una (solo .ts, .html, .scss y
.spec.ts del componente). Si alguna tiene otro archivo, DETENETE y reportá.

## Verificación

1. El grep de 0.1 → sin resultados.
2. El grep de 0.2 → sin resultados.
3. `grep -cE "tarifas(Gral|Esp|Pers)" src/app/servicios/storage/storage.service.ts`
   → 8 (solo los `case` de controlLog, que se conservan).
4. `grep -n "listenForChanges<" src/app/raiz/home/home.component.ts` → sin
   resultados (queda solo listenForChangesField de noOperativo).
5. `grep -rn "tarifa-gral-cliente\|tarifa-personalizada-cliente" src/app/raiz/home src/app/servicios/storage`
   → sin resultados.
6. `npm run build:demo` sin errores nuevos.
7. `git status` (solo lectura) y el diff de los 3 archivos editados.

## Pruebas manuales (demo)

1. Login y navegación general (Operaciones, Clientes, Choferes,
   Proveedores, Liquidación, Tarifas): sin errores en consola.
2. Tablero de asignaciones: los choferes no disponibles siguen marcados
   (listener de noOperativo intacto).
3. Tarifas (/tarifas): General, Especial, Personalizada, Eventual e
   Historial funcionan igual.
4. Alta, cierre y edición de InformeOp de una operación: sin cambios.
5. (Opcional) DevTools → Network/Firestore: al cargar la app ya no se abren
   listeners sobre tarifasGralCliente & cía.

## Mensaje de commit

refactor(tarifas): retira componentes shared y estado viejo de tarifas (TC-R3)

- SharedModule: fuera ConsolaTarifa, HistorialTarifasGral,
  TarifasEventuales y TarigaGralEdicion (borrados, con sus specs).
- HomeComponent: fuera los 7 listeners de colecciones viejas de tarifas y
  `tarifas$`.
- StorageService: fuera 33 subjects del sistema viejo de tarifas con sus
  cases en setInfo/getObservable (controlLog sin cambios).

FIN DE LA INSTRUCCIÓN TC-R3
````
