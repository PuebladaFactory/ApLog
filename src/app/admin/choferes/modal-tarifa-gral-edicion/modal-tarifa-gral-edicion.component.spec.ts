import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalTarifaGralEdicionComponent } from './modal-tarifa-gral-edicion.component';

describe('ModalTarifaGralEdicionComponent', () => {
  let component: ModalTarifaGralEdicionComponent;
  let fixture: ComponentFixture<ModalTarifaGralEdicionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalTarifaGralEdicionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalTarifaGralEdicionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
