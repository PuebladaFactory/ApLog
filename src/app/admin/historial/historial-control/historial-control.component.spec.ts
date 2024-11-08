import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialControlComponent } from './historial-control.component';

describe('HistorialControlComponent', () => {
  let component: HistorialControlComponent;
  let fixture: ComponentFixture<HistorialControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HistorialControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
