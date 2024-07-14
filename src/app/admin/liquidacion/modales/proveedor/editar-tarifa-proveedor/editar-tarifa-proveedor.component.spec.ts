import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarTarifaProveedorComponent } from './editar-tarifa-proveedor.component';

describe('EditarTarifaProveedorComponent', () => {
  let component: EditarTarifaProveedorComponent;
  let fixture: ComponentFixture<EditarTarifaProveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditarTarifaProveedorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarTarifaProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
