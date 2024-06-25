import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialGeneralComponent } from './historial-general.component';

describe('HistorialGeneralComponent', () => {
  let component: HistorialGeneralComponent;
  let fixture: ComponentFixture<HistorialGeneralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HistorialGeneralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialGeneralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
