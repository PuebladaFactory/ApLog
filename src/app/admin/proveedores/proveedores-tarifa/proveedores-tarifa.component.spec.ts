import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedoresTarifaComponent } from './proveedores-tarifa.component';

describe('ProveedoresTarifaComponent', () => {
  let component: ProveedoresTarifaComponent;
  let fixture: ComponentFixture<ProveedoresTarifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProveedoresTarifaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProveedoresTarifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
