import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifasEventualesComponent } from './tarifas-eventuales.component';

describe('TarifasEventualesComponent', () => {
  let component: TarifasEventualesComponent;
  let fixture: ComponentFixture<TarifasEventualesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TarifasEventualesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarifasEventualesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
