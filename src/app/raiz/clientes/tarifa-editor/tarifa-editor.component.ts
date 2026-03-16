import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from "@angular/core";
import { FormArray, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { TarifaPersonalizadaCliente } from "src/app/interfaces/tarifa-personalizada-cliente";
import { toISODateString } from "src/app/servicios/fechas/date-range.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import { TarifaForm } from "../cliente-tarifa-personalizada/cliente-tarifa-personalizada.component";
import Swal from "sweetalert2";
import {
  ErrorTarifa,
  TarifasService,
} from "src/app/servicios/tarifas/tarifas.service";
import { Subject, takeUntil } from "rxjs";
import { ConId } from "src/app/interfaces/conId";

@Component({
  selector: "app-tarifa-editor",
  standalone: false,
  templateUrl: "./tarifa-editor.component.html",
  styleUrl: "./tarifa-editor.component.scss",
})
export class TarifaEditorComponent implements OnInit {
  @Input() idCliente!: number;
  @Input() tarifa?: ConId<TarifaPersonalizadaCliente> | null;
  @Input() modo: "crear" | "editar" | "duplicar" = "crear";
  @Output() guardar = new EventEmitter<TarifaForm>();

  form: any;
  seccionesAbiertas: boolean[] = [];
  private route = inject(ActivatedRoute);
  errorActual: ErrorTarifa | null = null;
  private destroy$ = new Subject<void>();
  formOriginal: string = "";

  constructor(
    private fb: FormBuilder,
    private tarifasService: TarifasService,
  ) {
    const fechaHoy = new Date().toISOString().substring(0, 10);
    this.form = this.fb.group({
      fecha: [fechaHoy, Validators.required],

      adKmboolean: [false],

      adicionales: this.fb.group({
        acompaniante: [0],

        KmDistancia: this.fb.group({
          primerSector: [0],
          sectoresSiguientes: [0],
        }),
      }),

      secciones: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    console.log(this.modo);

    if ((this.modo === "editar" || this.modo === "duplicar") && this.tarifa) {
      this.cargarTarifaEnFormulario(this.tarifa);
    }

    // guardar snapshot inicial
    this.formOriginal = JSON.stringify(this.form.value);

    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.errorActual) {
        this.errorActual = null;
      }
    });
  }

  cargarTarifaEnFormulario(tarifa: TarifaPersonalizadaCliente) {
    this.secciones.clear();
    this.seccionesAbiertas = [];

    tarifa.secciones.forEach((sec) => {
      const nuevaSeccion = this.crearSeccion();

      nuevaSeccion.patchValue({
        descripcion: sec.descripcion,
        orden: sec.orden,
      });

      this.secciones.push(nuevaSeccion);
      this.seccionesAbiertas.push(true);

      const seccionIndex = this.secciones.length - 1;

      sec.categorias.forEach((cat) => {
        const nuevaCategoria = this.crearCategoria(seccionIndex);

        nuevaCategoria.patchValue(cat);

        this.categorias(seccionIndex).push(nuevaCategoria);
      });
    });

    if (tarifa.adicionales) {
      this.form.patchValue({
        adKmboolean: true,
        adicionales: tarifa.adicionales,
      });
    }
  }

  get secciones(): FormArray {
    return this.form.get("secciones") as FormArray;
  }

  categorias(seccionIndex: number): FormArray {
    return this.secciones.at(seccionIndex).get("categorias") as FormArray;
  }

  crearSeccion(): FormGroup {
    return this.fb.group({
      orden: [this.secciones.length + 1],

      descripcion: [""],

      categorias: this.fb.array([]),
    });
  }

  agregarSeccion() {
    const seccion = this.crearSeccion();

    this.secciones.push(seccion);

    this.seccionesAbiertas.push(true);

    const index = this.secciones.length - 1;

    this.agregarCategoria(index);
  }

  eliminarSeccion(index: number) {
    this.secciones.removeAt(index);

    this.seccionesAbiertas.splice(index, 1);

    this.actualizarOrdenSecciones();
  }

  toggleSeccion(index: number) {
    this.seccionesAbiertas[index] = !this.seccionesAbiertas[index];
  }

  actualizarOrdenSecciones() {
    this.secciones.controls.forEach((sec, index) => {
      sec.get("orden")?.setValue(index + 1);
    });
  }

  crearCategoria(seccionIndex: number): FormGroup {
    const categorias = this.categorias(seccionIndex);

    return this.fb.group({
      orden: [categorias.length + 1],

      nombre: ["", Validators.required],

      aCobrar: [0, Validators.required],

      aPagar: [0, Validators.required],

      nuevoACobrar: [0],

      nuevoAPagar: [0],

      adicionalKmACobrar: this.fb.group({
        primerSector: [0],
        sectoresSiguientes: [0],
      }),

      adicionalKmAPagar: this.fb.group({
        primerSector: [0],
        sectoresSiguientes: [0],
      }),
    });
  }

  agregarCategoria(seccionIndex: number) {
    const categoria = this.crearCategoria(seccionIndex);

    this.categorias(seccionIndex).push(categoria);
  }

  eliminarCategoria(seccionIndex: number, categoriaIndex: number) {
    this.categorias(seccionIndex).removeAt(categoriaIndex);

    this.actualizarOrdenCategorias(seccionIndex);
  }

  actualizarOrdenCategorias(seccionIndex: number) {
    this.categorias(seccionIndex).controls.forEach((cat, index) => {
      cat.get("orden")?.setValue(index + 1);
    });
  }

  desactivarAdicionales() {
    this.form.get("adKmboolean")?.valueChanges.subscribe((usaKm: any) => {
      if (!usaKm) {
        this.secciones.controls.forEach((sec) => {
          const categorias = sec.get("categorias") as FormArray;

          categorias.controls.forEach((cat) => {
            cat.get("adicionalKmACobrar")?.reset();
            cat.get("adicionalKmAPagar")?.reset();
          });
        });
      }
    });
  }

  async guardarTarifa() {
    const error = this.tarifasService.validarTarifa(this.form.value);

    if (error) {
      this.errorActual = error;

      this.mensajesError(error.mensaje);

      if (error.seccionIndex !== undefined) {
        this.scrollASeccion(error.seccionIndex);
      }

      return;
    }

    const respuesta = await Swal.fire({
      title: `¿Guardar la tarifa?`,
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });

    console.log(this.form.value);
    

    if (respuesta.isConfirmed) this.guardar.emit(this.form.value);
  }

  duplicarCategoria(seccionIndex: number, categoriaIndex: number) {
    const categoria = this.categorias(seccionIndex).at(categoriaIndex).value;

    const nueva = this.crearCategoria(seccionIndex);

    nueva.patchValue(categoria);

    this.categorias(seccionIndex).push(nueva);
  }

  duplicarSeccion(index: number) {
    const seccionOriginal = this.secciones.at(index).value;

    const nuevaSeccion = this.crearSeccion();

    nuevaSeccion.patchValue({
      descripcion: seccionOriginal.descripcion,
    });

    this.secciones.push(nuevaSeccion);

    const nuevaIndex = this.secciones.length - 1;

    // duplicar categorias
    seccionOriginal.categorias.forEach((cat: any) => {
      const nuevaCategoria = this.crearCategoria(nuevaIndex);

      nuevaCategoria.patchValue(cat);

      this.categorias(nuevaIndex).push(nuevaCategoria);
    });

    this.actualizarOrdenSecciones();
  }

  enterNuevaCategoria(
    event: Event,
    seccionIndex: number,
    categoriaIndex: number,
  ) {
    const keyboardEvent = event as KeyboardEvent;

    keyboardEvent.preventDefault();

    const esUltima =
      categoriaIndex === this.categorias(seccionIndex).length - 1;

    if (esUltima) {
      this.agregarCategoria(seccionIndex);

      setTimeout(() => {
        const inputs = document.querySelectorAll(
          'input[formControlName="nombre"]',
        );

        const ultimo = inputs[inputs.length - 1] as HTMLElement;

        ultimo?.focus();
      });
    }
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  scrollASeccion(index: number) {
    const el = document.getElementById("seccion-" + index);

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  tieneValorCero(c: any): boolean {
    return this.obtenerValoresCategoria(c).some((v) => v === 0);
  }

  obtenerValoresCategoria(c: any): number[] {
    const valores: number[] = [];

    if (c.aCobrar !== undefined) valores.push(c.aCobrar);
    if (c.aPagar !== undefined) valores.push(c.aPagar);

    if (this.form.get("adKmboolean").value) {
      valores.push(c.adicionalKmACobrar.primerSector);
      valores.push(c.adicionalKmACobrar.sectoresSiguientes);
      valores.push(c.adicionalKmAPagar.primerSector);
      valores.push(c.adicionalKmAPagar.sectoresSiguientes);
    }

    return valores;
  }

  existenValoresCero(): boolean {
    const form = this.form.value;

    const categoriasConCero = form.secciones?.some((s: any) =>
      s.categorias?.some((c: any) =>
        this.obtenerValoresCategoria(c).some((v) => v === 0),
      ),
    );

    return categoriasConCero;
  }

  async cancelar() {
    if (!this.hayCambios()) {
      window.history.back();
      return;
    }

    const res = await Swal.fire({
      icon: "warning",
      title: "Hay cambios sin guardar",
      text: "Si sales ahora perderás los cambios realizados",
      showCancelButton: true,
      confirmButtonText: "Salir sin guardar",
      cancelButtonText: "Continuar editando",
    });

    if (res.isConfirmed) {
      window.history.back();
    }
  }

  hayCambios(): boolean {
    return JSON.stringify(this.form.value) !== this.formOriginal;
  }

  
}
