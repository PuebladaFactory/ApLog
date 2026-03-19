import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
} from "@angular/forms";
import { ConId } from "src/app/interfaces/conId";
import {
  Seccion,
  TarifaPersonalizadaCliente,
} from "src/app/interfaces/tarifa-personalizada-cliente";
import { TarifaForm } from "../cliente-tarifa-personalizada/cliente-tarifa-personalizada.component";
import Swal from "sweetalert2";

export interface TarifaAumentoPayload {
  tarifa: TarifaForm;
  resumen: ResumenTarifa;
  metadata: {
    tipoAumento: "manual" | "automatico";
    porcentajeAplicado?: number | null;
    redondeo?: "unidad" | "decena" | "centena" | null;
  };
}

export interface ResumenTarifa {
  base: {
    cobrar: Resultado;
    pagar: Resultado;
  };
  km?: {
    cobrar: Resultado;
    pagar: Resultado;
  };
  total: Resultado;
}

export interface Resultado {
  porcentaje: number;
  monto: number;
}

@Component({
  selector: "app-cliente-tarifa-aumento",
  standalone: false,
  templateUrl: "./cliente-tarifa-aumento.component.html",
  styleUrl: "./cliente-tarifa-aumento.component.scss",
})
export class ClienteTarifaAumentoComponent implements OnInit {
  @Input() tarifa!: ConId<TarifaPersonalizadaCliente>;

  @Output() guardar = new EventEmitter<TarifaForm | TarifaAumentoPayload>();
  @Output() cancelar = new EventEmitter<void>();

  form!: FormGroup;

  modo: "automatico" | "manual" = "automatico";

  porcentaje = 0;

  usarRedondeo: boolean = true;

  modoAutomatico = true;

  porcentajeAumento = 0;

  tipoRedondeo: "unidad" | "decena" | "centena" = "unidad";

  conSpanExt: number = 7;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.conSpanExt = this.tarifa.adKmboolean ? 15 : 7;
    this.crearFormulario();
  }

  crearFormulario(): void {
    this.form = this.fb.group({
      secciones: this.fb.array([]),
      kmDistancia: this.fb.group({
        primerSector: [
          this.tarifa?.adicionales?.KmDistancia?.primerSector ?? 0,
        ],
        sectoresSiguientes: [
          this.tarifa?.adicionales?.KmDistancia?.sectoresSiguientes ?? 0,
        ],
      }),
    });

    if (!this.tarifa) return;

    //console.log("2)", this.tarifa.secciones);

    this.tarifa.secciones.forEach((seccion) => {
      const seccionGroup = this.fb.group({
        orden: [seccion.orden],
        descripcion: [seccion.descripcion],
        categorias: this.fb.array([]),
      });

      const categoriasArray = seccionGroup.get("categorias") as FormArray;

      seccion.categorias.forEach((cat) => {
        const categoriaGroup = this.fb.group({
          nombre: [cat.nombre],
          orden: [cat.orden],
          actualACobrar: [cat.aCobrar],
          nuevoACobrar: [cat.nuevoACobrar],

          actualAPagar: [cat.aPagar],
          nuevoAPagar: [cat.nuevoAPagar],

          actualKmCobrarPrimer: [cat.adicionalKmACobrar?.primerSector ?? 0],
          actualKmCobrarSig: [cat.adicionalKmACobrar?.sectoresSiguientes ?? 0],

          nuevoKmCobrarPrimer: [cat.nuevoAdKmACobrar?.primerSector ?? 0],
          nuevoKmCobrarSig: [cat.nuevoAdKmACobrar?.sectoresSiguientes ?? 0],

          actualKmPagarPrimer: [cat.adicionalKmAPagar?.primerSector ?? 0],
          actualKmPagarSig: [cat.adicionalKmAPagar?.sectoresSiguientes ?? 0],

          nuevoKmPagarPrimer: [cat.nuevoAdKmAPagar?.primerSector ?? 0],
          nuevoKmPagarSig: [cat.nuevoAdKmAPagar?.sectoresSiguientes ?? 0],
        });

        categoriasArray.push(categoriaGroup);
      });

      this.secciones.push(seccionGroup);
    });
    //console.log("this.secciones", this.secciones.value);

    this.actualizarEstadoInputs();
  }

  /* ACCIONES */

  async guardarAumento(): Promise<void> {
    const respuesta = await Swal.fire({
      title: `¿Aplicar el aumento?`,
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });

    //console.log(this.form.value);
    const form = this.form.getRawValue();

    if (respuesta.isConfirmed) {
      const tarifa = this.transformarTarifa(form);
      const resumen = this.calcularResumen();

      const payload: TarifaAumentoPayload = {
        tarifa,
        resumen,
        metadata: {
          tipoAumento: this.modoAutomatico ? "automatico" : "manual",
          porcentajeAplicado: this.modoAutomatico
            ? this.porcentajeAumento
            : null,
          redondeo: this.usarRedondeo ? this.tipoRedondeo : null,
        },
      };

      //console.log("payload: ", payload);
      
      this.guardar.emit(payload);
    }
  }

  transformarTarifa(form: any): TarifaForm {
    const secciones = form.secciones.map((sec: any) => {
      return {
        orden: sec.orden,
        descripcion: sec.descripcion,

        categorias: sec.categorias.map((cat: any) => {
          const categoria: any = {
            nombre: cat.nombre,
            orden: cat.orden,
            aCobrar: cat.nuevoACobrar,
            aPagar: cat.nuevoAPagar,
          };

          // SOLO si hay adicional KM
          if (this.tarifa.adKmboolean) {
            categoria.adicionalKmACobrar = {
              primerSector: cat.nuevoKmCobrarPrimer ?? 0,
              sectoresSiguientes: cat.nuevoKmCobrarSig ?? 0,
            };

            categoria.adicionalKmAPagar = {
              primerSector: cat.nuevoKmPagarPrimer ?? 0,
              sectoresSiguientes: cat.nuevoKmPagarSig ?? 0,
            };
          }

          return categoria;
        }),
      };
    });

    return {
      secciones,

      adKmboolean: this.tarifa.adKmboolean ?? false,

      adicionales: this.tarifa.adKmboolean
        ? {
            KmDistancia: {
              primerSector: form.kmDistancia.primerSector,
              sectoresSiguientes: form.kmDistancia.sectoresSiguientes,
            },
          }
        : null,
    };
  }

  cancelarOperacion(): void {
    this.cancelar.emit();
  }

  resetearValores() {
    this.crearFormulario();
    this.actualizarEstadoInputs();
  }

  /* HELPERS */
  get secciones(): FormArray {
    return this.form.get("secciones") as FormArray;
  }

  getNombreSeccion(seccion: AbstractControl): string {
    return seccion.get("nombre")?.value;
  }

  getCategorias(seccion: AbstractControl): FormArray {
    return seccion.get("categorias") as FormArray;
  }

  getControl(cat: AbstractControl, nombre: string): FormControl {
    return cat.get(nombre) as FormControl;
  }

  getValor(cat: AbstractControl, nombre: string): number {
    return cat.get(nombre)?.value ?? 0;
  }

  esControl(cat: any, nombre: string) {
    return !!cat.get(nombre);
  }

  get kmDistancia(): FormGroup {
    return this.form.get("kmDistancia") as FormGroup;
  }

  get kmPrimerSector(): FormControl {
    return this.kmDistancia.get("primerSector") as FormControl;
  }

  get kmSectoresSiguientes(): FormControl {
    return this.kmDistancia.get("sectoresSiguientes") as FormControl;
  }

  /* CONSOLA AUMENTO */

  aplicarAumentoTarifa(
    secciones: Seccion[],
    porcentaje: number,
    usarRedondeo: boolean,
  ): Seccion[] {
    const factor = 1 + porcentaje / 100;

    return secciones.map((seccion) => {
      const categorias = seccion.categorias.map((cat) => {
        const nuevoACobrar = this.calcularValor(
          cat.aCobrar,
          factor,
          usarRedondeo,
        );
        const nuevoAPagar = this.calcularValor(
          cat.aPagar,
          factor,
          usarRedondeo,
        );

        let nuevoAdKmACobrar = cat.adicionalKmACobrar;
        let nuevoAdKmAPagar = cat.adicionalKmAPagar;

        if (cat.adicionalKmACobrar) {
          nuevoAdKmACobrar = {
            primerSector: this.calcularValor(
              cat.adicionalKmACobrar.primerSector,
              factor,
              usarRedondeo,
            ),
            sectoresSiguientes: this.calcularValor(
              cat.adicionalKmACobrar.sectoresSiguientes,
              factor,
              usarRedondeo,
            ),
          };
        }

        if (cat.adicionalKmAPagar) {
          nuevoAdKmAPagar = {
            primerSector: this.calcularValor(
              cat.adicionalKmAPagar.primerSector,
              factor,
              usarRedondeo,
            ),
            sectoresSiguientes: this.calcularValor(
              cat.adicionalKmAPagar.sectoresSiguientes,
              factor,
              usarRedondeo,
            ),
          };
        }

        return {
          ...cat,
          nuevoACobrar,
          nuevoAPagar,
          nuevoAdKmACobrar,
          nuevoAdKmAPagar,
        };
      });

      return {
        ...seccion,
        categorias,
      };
    });
  }

  calcularValor(valor: number, factor: number, usarRedondeo: boolean): number {
    const resultado = valor * factor;

    if (!usarRedondeo) {
      return Math.round(resultado);
    }

    return this.redondear(resultado);
  }

  aplicarAumento() {
    const seccionesActuales = this.tarifa.secciones;

    const nuevasSecciones = this.aplicarAumentoTarifa(
      seccionesActuales,
      this.porcentajeAumento,
      this.usarRedondeo,
    );
    //console.log("1) nuevasSecciones: ", nuevasSecciones);

    this.tarifa.secciones = nuevasSecciones;
    this.crearFormulario();
  }

  redondear(valor: number): number {
    switch (this.tipoRedondeo) {
      case "decena":
        return Math.round(valor / 10) * 10;

      case "centena":
        return Math.round(valor / 100) * 100;

      default:
        return Math.round(valor);
    }
  }

  cambiarModo() {
    if (!this.modoAutomatico) {
      this.actualizarEstadoInputs();
      return;
    }

    this.aplicarAumento();
  }

  actualizarEstadoInputs() {
    this.secciones.controls.forEach((seccion: any) => {
      const categorias = seccion.get("categorias").controls;

      categorias.forEach((cat: any) => {
        const controles = [
          "nuevoACobrar",
          "nuevoAPagar",
          "nuevoKmCobrarPrimer",
          "nuevoKmCobrarSig",
          "nuevoKmPagarPrimer",
          "nuevoKmPagarSig",
        ];

        controles.forEach((nombre) => {
          const ctrl = cat.get(nombre);

          if (!ctrl) return;

          if (this.modoAutomatico) {
            ctrl.disable({ emitEvent: false });
          } else {
            ctrl.enable({ emitEvent: false });
          }
        });
      });
    });
  }

  /* RESUMEN Y CAMBIOS*/

  hayCambios(): boolean {
    const form = this.form.getRawValue();

    for (const sec of form.secciones) {
      for (const cat of sec.categorias) {
        if (cat.actualACobrar !== cat.nuevoACobrar) return true;
        if (cat.actualAPagar !== cat.nuevoAPagar) return true;

        if (this.tarifa.adKmboolean) {
          if (cat.actualKmCobrarPrimer !== cat.nuevoKmCobrarPrimer) return true;
          if (cat.actualKmCobrarSig !== cat.nuevoKmCobrarSig) return true;

          if (cat.actualKmPagarPrimer !== cat.nuevoKmPagarPrimer) return true;
          if (cat.actualKmPagarSig !== cat.nuevoKmPagarSig) return true;
        }
      }
    }

    // KM DISTANCIA
    if (this.tarifa.adKmboolean) {
      const km = form.kmDistancia;
      const original = this.tarifa.adicionales?.KmDistancia;

      if (
        km.primerSector !== original?.primerSector ||
        km.sectoresSiguientes !== original?.sectoresSiguientes
      ) {
        return true;
      }
    }

    return false;
  }

  calcularResumen(): ResumenTarifa {
    let base = {
      cobrarActual: 0,
      cobrarNuevo: 0,
      pagarActual: 0,
      pagarNuevo: 0,
    };

    let km = {
      cobrarActual: 0,
      cobrarNuevo: 0,
      pagarActual: 0,
      pagarNuevo: 0,
    };

    this.secciones.controls.forEach((sec) => {
      this.getCategorias(sec).controls.forEach((cat) => {
        const get = (key: string) => cat.get(key)?.value || 0;

        // BASE
        base.cobrarActual += get("actualACobrar");
        base.cobrarNuevo += get("nuevoACobrar");

        base.pagarActual += get("actualAPagar");
        base.pagarNuevo += get("nuevoAPagar");

        // KM
        if (this.tarifa.adKmboolean) {
          km.cobrarActual +=
            get("actualKmCobrarPrimer") + get("actualKmCobrarSig");

          km.cobrarNuevo +=
            get("nuevoKmCobrarPrimer") + get("nuevoKmCobrarSig");

          km.pagarActual +=
            get("actualKmPagarPrimer") + get("actualKmPagarSig");

          km.pagarNuevo += get("nuevoKmPagarPrimer") + get("nuevoKmPagarSig");
        }
      });
    });

    const calc = (actual: number, nuevo: number) => ({
      porcentaje: actual ? ((nuevo - actual) / actual) * 100 : 0,
      monto: nuevo - actual,
    });

    const baseRes = {
      cobrar: calc(base.cobrarActual, base.cobrarNuevo),
      pagar: calc(base.pagarActual, base.pagarNuevo),
    };

    const kmRes = this.tarifa.adKmboolean
      ? {
          cobrar: calc(km.cobrarActual, km.cobrarNuevo),
          pagar: calc(km.pagarActual, km.pagarNuevo),
        }
      : null;

    const totalActual =
      base.cobrarActual + base.pagarActual + km.cobrarActual + km.pagarActual;

    const totalNuevo =
      base.cobrarNuevo + base.pagarNuevo + km.cobrarNuevo + km.pagarNuevo;

    const totalRes = calc(totalActual, totalNuevo);

    return {
      base: baseRes,
      ...(kmRes && { km: kmRes }),
      total: totalRes,
    };
  }

  /* DETALLES */
  expandedCatIndex: { seccion: number; categoria: number } | null = null;

  toggleDetalle(seccionIndex: number, categoriaIndex: number) {
    if (
      this.expandedCatIndex?.seccion === seccionIndex &&
      this.expandedCatIndex?.categoria === categoriaIndex
    ) {
      this.expandedCatIndex = null;
    } else {
      this.expandedCatIndex = {
        seccion: seccionIndex,
        categoria: categoriaIndex,
      };
    }
  }

  calcularDelta(actual: number, nuevo: number) {
    const diferencia = nuevo - actual;
    const porcentaje = actual ? (diferencia / actual) * 100 : 0;

    return {
      monto: diferencia,
      porcentaje,
    };
  }

  calcularImpactoCategoria(cat: AbstractControl): number {
    let totalActual = 0;
    let totalNuevo = 0;

    const get = (key: string) => cat.get(key)?.value || 0;

    // Base
    totalActual += get("actualACobrar") + get("actualAPagar");
    totalNuevo += get("nuevoACobrar") + get("nuevoAPagar");

    // KM (si existe)
    if (this.tarifa.adKmboolean) {
      totalActual +=
        get("actualKmCobrarPrimer") +
        get("actualKmCobrarSig") +
        get("actualKmPagarPrimer") +
        get("actualKmPagarSig");

      totalNuevo +=
        get("nuevoKmCobrarPrimer") +
        get("nuevoKmCobrarSig") +
        get("nuevoKmPagarPrimer") +
        get("nuevoKmPagarSig");
    }

    if (!totalActual) return 0;

    return ((totalNuevo - totalActual) / totalActual) * 100;
  }

  calcularImpactoSeccion(seccion: AbstractControl): number {
    const categorias = this.getCategorias(seccion).controls;

    let totalActual = 0;
    let totalNuevo = 0;

    categorias.forEach((cat) => {
      const get = (key: string) => cat.get(key)?.value || 0;

      totalActual += get("actualACobrar") + get("actualAPagar");
      totalNuevo += get("nuevoACobrar") + get("nuevoAPagar");

      if (this.tarifa.adKmboolean) {
        totalActual +=
          get("actualKmCobrarPrimer") +
          get("actualKmCobrarSig") +
          get("actualKmPagarPrimer") +
          get("actualKmPagarSig");

        totalNuevo +=
          get("nuevoKmCobrarPrimer") +
          get("nuevoKmCobrarSig") +
          get("nuevoKmPagarPrimer") +
          get("nuevoKmPagarSig");
      }
    });

    if (!totalActual) return 0;

    return ((totalNuevo - totalActual) / totalActual) * 100;
  }
}
