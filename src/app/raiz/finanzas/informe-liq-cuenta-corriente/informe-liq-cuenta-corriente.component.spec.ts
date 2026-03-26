import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformeLiqCuentaCorrienteComponent } from './informe-liq-cuenta-corriente.component';

describe('InformeLiqDetalleComponent', () => {
  let component: InformeLiqCuentaCorrienteComponent;
  let fixture: ComponentFixture<InformeLiqCuentaCorrienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformeLiqCuentaCorrienteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformeLiqCuentaCorrienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
