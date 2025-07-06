import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionClienteComponent } from './facturacion-cliente.component';

describe('FacturacionClienteComponent', () => {
  let component: FacturacionClienteComponent;
  let fixture: ComponentFixture<FacturacionClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacturacionClienteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
