import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalTarifaGralEdicionProComponent } from './modal-tarifa-gral-edicion-pro.component';

describe('ModalTarifaGralEdicionProComponent', () => {
  let component: ModalTarifaGralEdicionProComponent;
  let fixture: ComponentFixture<ModalTarifaGralEdicionProComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalTarifaGralEdicionProComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalTarifaGralEdicionProComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
