import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaOpComponent } from './consulta-op.component';

describe('ConsultaOpComponent', () => {
  let component: ConsultaOpComponent;
  let fixture: ComponentFixture<ConsultaOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConsultaOpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsultaOpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
