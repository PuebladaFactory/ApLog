import { Injectable, Input } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Legajo } from 'src/app/interfaces/legajo';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Injectable({
  providedIn: 'root',
})
export class ValidarService implements Validators {
  

  constructor(private fb: FormBuilder) {}
  
    nombreV = this.fb.group({                             
      nombre: ["", [Validators.required, Validators.maxLength(30)]],
    });
    
    apellidoV= this.fb.group({                             
      apellido: ["", [Validators.required, Validators.maxLength(30)]],
    });

    cuitV= this.fb.group({                             
      cuit: ["", [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
    });

    fechaNacV= this.fb.group({                             
      fechaNac: ["", [Validators.required]],
    });

    emailV= this.fb.group({
      email: ["", [Validators.required]],
    });

    celulcarContactoV= this.fb.group({
      celulcarContacto: ["", [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
    });

    celularEmergenciaV= this.fb.group({
      celularEmergencia: ["", [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
    });

    domicilioV= this.fb.group({                             
      domicilio: ["", [Validators.required, Validators.maxLength(50)]],
    });

    dominioV= this.fb.group({                             
      dominio: ["", [Validators.required, Validators.minLength(6), Validators.maxLength(8)]],
    });

    marcaV= this.fb.group({                             
      marca: ["", [Validators.required, Validators.maxLength(30)]],
    });

    modeloV= this.fb.group({                             
      modelo: ["", [Validators.required, Validators.maxLength(30)]],
    });
    
    proveedorV= this.fb.group({                             
      proveedor: ["", [Validators.required, Validators.maxLength(30)]],
    });

    marcaGpsV= this.fb.group({                             
      marcaGps: ["", [Validators.required, Validators.maxLength(30)]],
    });

     // Validador para solo permitir caracteres alfabéticos y especiales
  static soloLetras(control: AbstractControl): ValidationErrors | null {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-']*$/;
    const valid = regex.test(control.value);
    return valid ? null : { soloLetras: true };
  }

  // Validador para solo permitir números
  static soloNumeros(control: AbstractControl): ValidationErrors | null {
    const regex = /^[0-9]*$/;
    const valid = regex.test(control.value);
    return valid ? null : { soloNumeros: true };
  }

  static cuitValido(control: AbstractControl): ValidationErrors | null {
    const regex = /^\d{2}-\d{8}-\d{1}$/; // 2 dígitos, guion, 8 dígitos, guion, 1 dígito
    const valid = regex.test(control.value);
    return valid ? null : { cuitInvalido: true };
  }

  static validarDominio(control: AbstractControl): ValidationErrors | null {
    const dominio = control.value;

    // Expresiones regulares insensibles a mayúsculas/minúsculas (flag "i")
    const formatoViejo = /^[a-zA-Z]{3}[0-9]{3}$/i; // AAA111 o aaa111
    const formatoNuevo = /^[a-zA-Z]{2}[0-9]{3}[a-zA-Z]{2}$/i; // AA111AA o aa111aa

    // Validar contra ambas expresiones
    if (dominio && !formatoViejo.test(dominio) && !formatoNuevo.test(dominio)) {
      return { dominioInvalido: true }; // Error si no cumple con ninguno
    }

    return null; // Sin errores
  }
  



   /* formato2Form = this.fb.group({                             
      dominio: ["", [Validators.required, this.validarFormato2()]],
    });*/
  
    
    
  
   /* validarFormato1(): ValidatorFn {
      return (control: AbstractControl) => {
        const patente = control.value;
        const formato1 = /^[a-zA-Z]{3}\d{3}$/;
        if (formato1.test(patente)) {
          return null; // La patente es válida para formato 1
        } else {
          return { formato1Invalido: true };
        }
      };
    }
  
    validarFormato2(): ValidatorFn {
      return (control: AbstractControl) => {
        const patente = control.value;
        const formato2 = /^[a-zA-Z]{2}\d{3}[a-zA-Z]{2}$/;
        if (formato2.test(patente)) {
          return null; // La patente es válida para formato 2
        } else {
          return { formato2Invalido: true };
        }
      };
    }*/
  }











 /* constructor(private fb: FormBuilder, private storageService: StorageService, private router:Router) {
    form = this.fb.group({                             //formulario para el perfil 
      nombre: ["", [Validators.required, Validators.maxLength(30)]], 
      apellido: ["",[Validators.required, Validators.maxLength(30)]], 
      cuit: ["",[Validators.required, Validators.minLength(11), Validators.maxLength(11)]],            
      fechaNac: ["",Validators.required],
      email: ["",[Validators.required, Validators.email]],
      celularContacto: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]],
      celularEmergencia: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]],
      domicilio: ["", [Validators.required, Validators.maxLength(50)]],
});
    vehiculoForm = this.fb.group({
      dominio: ["",[Validators.required,Validators.minLength(6), Validators.maxLength(8)]], 
    });

} ultimo no valido */

/* valdominio(): Validator{
  return (control) => {
    const dominio = control.value;
    if ((dominio && !/^[a-zA-Z]{3}[\d]{3}$/.test(dominio) || dominio && !/^[a-zA-Z]{3}[\d]{3}$/.test(dominio))
        return {domio: true} ;     
    } else {

      return null;
      
    }; */


/*import { Injectable } from '@angular/core';
import { Component } from '@angular/core';
import {
  AbstractControl,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Legajo } from 'src/app/interfaces/legajo';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { Router } from '@angular/router';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Injectable({
  providedIn: 'root'
})
export class ValidarService implements Validators{

 
  dominio: any = {
    patentesViejas: /^[a-zA-Z]{3}[\d]{3}$/,
    patentesNuevas: /^[a-zA-Z]{2}[0-9]{3}[a-zA-Z]{2}$/,
    patentesMotosViejas: /^[0-9]{3}[a-zA-Z]{3}$/,
    patentesMotosNuevas: /^[a-zA-Z]{1}[0-9]{3}[a-zA-Z]{3}$/,
    
  };
  
  constructor(private storage: StorageService) {
    this.dominio.data$.subscribe(
      (data: any) => (this.dominio = data));
  }
  validate(control: AbstractControl<any, any>): ValidationErrors | null {
    throw new Error('Method not implemented.');
  }
  registerOnValidatorChange?(fn: () => void): void {
    throw new Error('Method not implemented.');
  }
  evaluarFormatoPatente(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null =>
      this.validarPatente(control.value)
        ? null
        : { patenteErronea: control.value };
  }

// patente -> booolea
validarPatente(patente: string) {
  return (
    this.dominio.patentesViejas.test(patente) ||
    this.dominio.patentesNuevas.test(patente) ||
    this.dominio.patentesMotosViejas.test(patente) ||
    this.dominio.patentesMotosNuevas.test(patente) ||
    this.dominio.barCode.test(patente)
  );


   }
  } */
