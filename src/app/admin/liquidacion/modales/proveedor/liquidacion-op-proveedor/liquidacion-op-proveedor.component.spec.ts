import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiquidacionOpProveedorComponent } from './liquidacion-op-proveedor.component';

describe('LiquidacionOpProveedorComponent', () => {
  let component: LiquidacionOpProveedorComponent;
  let fixture: ComponentFixture<LiquidacionOpProveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiquidacionOpProveedorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiquidacionOpProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
