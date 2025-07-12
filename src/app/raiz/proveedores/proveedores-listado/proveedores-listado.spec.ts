import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedoresListadoComponent } from './proveedores-listado.component';

describe('ListadoNuevoProveedorComponent', () => {
  let component: ProveedoresListadoComponent;
  let fixture: ComponentFixture<ProveedoresListadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProveedoresListadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProveedoresListadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
