import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalTarifaPersonalizadaComponent } from './modal-tarifa-personalizada.component';

describe('ModalTarifaPersonalizadaComponent', () => {
  let component: ModalTarifaPersonalizadaComponent;
  let fixture: ComponentFixture<ModalTarifaPersonalizadaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalTarifaPersonalizadaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalTarifaPersonalizadaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
