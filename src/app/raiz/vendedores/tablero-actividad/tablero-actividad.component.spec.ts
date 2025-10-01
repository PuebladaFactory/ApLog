import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroActividadComponent } from './tablero-actividad.component';

describe('TableroActividadComponent', () => {
  let component: TableroActividadComponent;
  let fixture: ComponentFixture<TableroActividadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableroActividadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableroActividadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
