import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiqProveedorComponent } from './liq-proveedor.component';

describe('LiqProveedorComponent', () => {
  let component: LiqProveedorComponent;
  let fixture: ComponentFixture<LiqProveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiqProveedorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiqProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
