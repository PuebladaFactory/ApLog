import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovimientoDetalleComponent } from './movimiento-detalle.component';

describe('MovimientoDetalleComponent', () => {
  let component: MovimientoDetalleComponent;
  let fixture: ComponentFixture<MovimientoDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovimientoDetalleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovimientoDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
