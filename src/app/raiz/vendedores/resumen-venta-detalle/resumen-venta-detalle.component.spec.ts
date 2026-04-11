import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumenVentaDetalleComponent } from './resumen-venta-detalle.component';

describe('ResumenVentaDetalleComponent', () => {
  let component: ResumenVentaDetalleComponent;
  let fixture: ComponentFixture<ResumenVentaDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenVentaDetalleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumenVentaDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
