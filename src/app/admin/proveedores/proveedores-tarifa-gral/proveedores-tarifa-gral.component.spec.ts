import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedoresTarifaGralComponent } from './proveedores-tarifa-gral.component';

describe('ProveedoresTarifaGralComponent', () => {
  let component: ProveedoresTarifaGralComponent;
  let fixture: ComponentFixture<ProveedoresTarifaGralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProveedoresTarifaGralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProveedoresTarifaGralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
