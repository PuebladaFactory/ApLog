import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiquidacionOpChoferComponent } from './liquidacion-op-chofer.component';

describe('LiquidacionOpChoferComponent', () => {
  let component: LiquidacionOpChoferComponent;
  let fixture: ComponentFixture<LiquidacionOpChoferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiquidacionOpChoferComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiquidacionOpChoferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
