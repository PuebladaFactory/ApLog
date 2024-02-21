import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiqChoferComponent } from './liq-chofer.component';

describe('LiqChoferComponent', () => {
  let component: LiqChoferComponent;
  let fixture: ComponentFixture<LiqChoferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiqChoferComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiqChoferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
