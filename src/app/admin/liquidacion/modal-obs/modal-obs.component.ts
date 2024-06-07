import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal-obs',
  templateUrl: './modal-obs.component.html',
  styleUrls: ['./modal-obs.component.scss']
})
export class ModalObsComponent {
  @Input() facturaChofer: any;
  form: FormGroup;

  constructor(public activeModal: NgbActiveModal, private fb: FormBuilder) {
    this.form = this.fb.group({
      detalle: ['']
    });
  }

  ngOnInit(): void {
    if (this.facturaChofer) {
      this.form.patchValue({ detalle: this.facturaChofer.operacion.observaciones });
    }
  }

  guardarDetalle(): void {
    if (this.form.valid) {
      this.activeModal.close(this.form.value);
    }
  }
}
