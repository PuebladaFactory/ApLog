import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionProveedorComponent } from './facturacion-proveedor.component';

describe('FacturacionProveedorComponent', () => {
  let component: FacturacionProveedorComponent;
  let fixture: ComponentFixture<FacturacionProveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacturacionProveedorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
