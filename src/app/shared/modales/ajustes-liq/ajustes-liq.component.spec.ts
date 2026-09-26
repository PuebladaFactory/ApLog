import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AjustesLiqComponent } from './ajustes-liq.component';

describe('AjustesLiqComponent', () => {
  let component: AjustesLiqComponent;
  let fixture: ComponentFixture<AjustesLiqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AjustesLiqComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjustesLiqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
