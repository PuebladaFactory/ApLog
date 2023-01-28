import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferLiquidacionComponent } from './chofer-liquidacion.component';

describe('ChoferLiquidacionComponent', () => {
  let component: ChoferLiquidacionComponent;
  let fixture: ComponentFixture<ChoferLiquidacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferLiquidacionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferLiquidacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
