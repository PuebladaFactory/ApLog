import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovimientoFinancieroComponent } from './movimiento-financiero.component';

describe('MovimientoFinancieroComponent', () => {
  let component: MovimientoFinancieroComponent;
  let fixture: ComponentFixture<MovimientoFinancieroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovimientoFinancieroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovimientoFinancieroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
