import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiquidacionesOpComponent } from './liquidaciones-op.component';

describe('NuevaLiqComponent', () => {
  let component: LiquidacionesOpComponent;
  let fixture: ComponentFixture<LiquidacionesOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiquidacionesOpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiquidacionesOpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
