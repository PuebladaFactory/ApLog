import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialTarifasGralComponent } from './historial-tarifas-gral.component';

describe('HistorialTarifasGralComponent', () => {
  let component: HistorialTarifasGralComponent;
  let fixture: ComponentFixture<HistorialTarifasGralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HistorialTarifasGralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialTarifasGralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
