import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiquidacionOpComponent } from './liquidacion-op.component';

describe('LiquidacionOpComponent', () => {
  let component: LiquidacionOpComponent;
  let fixture: ComponentFixture<LiquidacionOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiquidacionOpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiquidacionOpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
