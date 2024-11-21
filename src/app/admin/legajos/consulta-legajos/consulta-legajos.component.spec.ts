import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaLegajosComponent } from './consulta-legajos.component';

describe('ConsultaLegajosComponent', () => {
  let component: ConsultaLegajosComponent;
  let fixture: ComponentFixture<ConsultaLegajosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConsultaLegajosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsultaLegajosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
