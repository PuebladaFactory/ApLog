import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialChoferComponent } from './historial-chofer.component';

describe('HistorialChoferComponent', () => {
  let component: HistorialChoferComponent;
  let fixture: ComponentFixture<HistorialChoferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HistorialChoferComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialChoferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
