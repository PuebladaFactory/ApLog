import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionListadoComponent } from './facturacion-listado.component';

describe('FacturacionListadoComponent', () => {
  let component: FacturacionListadoComponent;
  let fixture: ComponentFixture<FacturacionListadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturacionListadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionListadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
