import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesControlComponent } from './choferes-control.component';

describe('ClienteControlComponent', () => {
  let component: ChoferesControlComponent;
  let fixture: ComponentFixture<ChoferesControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
