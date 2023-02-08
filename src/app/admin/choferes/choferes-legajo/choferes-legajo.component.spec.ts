import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesLegajoComponent } from './choferes-legajo.component';

describe('ChoferesLegajoComponent', () => {
  let component: ChoferesLegajoComponent;
  let fixture: ComponentFixture<ChoferesLegajoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesLegajoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesLegajoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
