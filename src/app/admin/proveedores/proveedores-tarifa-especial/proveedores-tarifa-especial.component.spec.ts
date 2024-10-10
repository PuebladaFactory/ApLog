import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedoresTarifaEspecialComponent } from './proveedores-tarifa-especial.component';

describe('ProveedoresTarifaEspecialComponent', () => {
  let component: ProveedoresTarifaEspecialComponent;
  let fixture: ComponentFixture<ProveedoresTarifaEspecialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProveedoresTarifaEspecialComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProveedoresTarifaEspecialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
