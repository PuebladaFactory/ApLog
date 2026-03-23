import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleCuentaCorrienteComponent } from './detalle-cuenta-corriente.component';

describe('DetalleCuentaCorrienteComponent', () => {
  let component: DetalleCuentaCorrienteComponent;
  let fixture: ComponentFixture<DetalleCuentaCorrienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleCuentaCorrienteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleCuentaCorrienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
