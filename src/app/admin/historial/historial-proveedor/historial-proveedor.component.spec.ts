import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialProveedorComponent } from './historial-proveedor.component';

describe('HistorialProveedorComponent', () => {
  let component: HistorialProveedorComponent;
  let fixture: ComponentFixture<HistorialProveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HistorialProveedorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
