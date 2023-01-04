import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BtnReimpresionComponent } from './btn-reimpresion.component';

describe('BtnReimpresionComponent', () => {
  let component: BtnReimpresionComponent;
  let fixture: ComponentFixture<BtnReimpresionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BtnReimpresionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BtnReimpresionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
