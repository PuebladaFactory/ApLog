import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiqGralComponent } from './liq-gral.component';

describe('LiqGralComponent', () => {
  let component: LiqGralComponent;
  let fixture: ComponentFixture<LiqGralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiqGralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiqGralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
