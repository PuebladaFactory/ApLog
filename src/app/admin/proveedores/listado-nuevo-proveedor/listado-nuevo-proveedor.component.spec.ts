import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoNuevoProveedorComponent } from './listado-nuevo-proveedor.component';

describe('ListadoNuevoProveedorComponent', () => {
  let component: ListadoNuevoProveedorComponent;
  let fixture: ComponentFixture<ListadoNuevoProveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoNuevoProveedorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoNuevoProveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
