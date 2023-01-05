import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-chofer-operacion',
  templateUrl: './chofer-operacion.component.html',
  styleUrls: ['./chofer-operacion.component.css']
})
export class ChoferOperacionComponent implements OnInit {

  opForm: any;

  constructor(private fb: FormBuilder) {
    this.opForm = this.fb.group({
        id:[""],
        fecha: [''],
        cliente: [''],
        km: [''],
        peaje: [''], 
        peajeComprobante: [''],
        remito: [''],       
    })
   }

  ngOnInit(): void {
  }

  onSubmit(){
    console.log(this.opForm.value);
    
  }

}
