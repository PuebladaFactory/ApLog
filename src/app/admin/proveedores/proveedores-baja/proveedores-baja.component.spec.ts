import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedoresBajaComponent } from './proveedores-baja.component';

describe('ProveedoresBajaComponent', () => {
  let component: ProveedoresBajaComponent;
  let fixture: ComponentFixture<ProveedoresBajaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProveedoresBajaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProveedoresBajaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
