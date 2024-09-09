import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifasGeneralesComponent } from './tarifas-generales.component';

describe('TarifasGeneralesComponent', () => {
  let component: TarifasGeneralesComponent;
  let fixture: ComponentFixture<TarifasGeneralesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TarifasGeneralesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarifasGeneralesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
