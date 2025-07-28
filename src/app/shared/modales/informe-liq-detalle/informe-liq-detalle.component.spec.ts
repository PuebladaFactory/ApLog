import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformeLiqDetalleComponent } from './informe-liq-detalle.component';

describe('ModalFacturaComponent', () => {
  let component: InformeLiqDetalleComponent;
  let fixture: ComponentFixture<InformeLiqDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InformeLiqDetalleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformeLiqDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
