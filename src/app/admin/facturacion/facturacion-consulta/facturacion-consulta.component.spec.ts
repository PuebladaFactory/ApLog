import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionConsultaComponent } from './facturacion-consulta.component';

describe('FacturacionConsultaComponent', () => {
  let component: FacturacionConsultaComponent;
  let fixture: ComponentFixture<FacturacionConsultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacturacionConsultaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
