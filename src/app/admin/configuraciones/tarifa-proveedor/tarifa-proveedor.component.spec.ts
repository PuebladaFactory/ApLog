import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifaProveedorComponent } from './tarifa-proveedor.component';

describe('TarifaProveedorComponent', () => {
  let component: TarifaProveedorComponent;
  let fixture: ComponentFixture<TarifaProveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TarifaProveedorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarifaProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
