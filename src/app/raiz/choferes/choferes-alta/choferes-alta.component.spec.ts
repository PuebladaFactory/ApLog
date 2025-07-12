import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesAltaComponent } from './choferes-alta.component';

describe('ClienteAltaComponent', () => {
  let component: ChoferesAltaComponent;
  let fixture: ComponentFixture<ChoferesAltaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesAltaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesAltaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
