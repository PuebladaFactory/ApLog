import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanzasControlComponent } from './finanzas-control.component';

describe('FinanzasControlComponent', () => {
  let component: FinanzasControlComponent;
  let fixture: ComponentFixture<FinanzasControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanzasControlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanzasControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
