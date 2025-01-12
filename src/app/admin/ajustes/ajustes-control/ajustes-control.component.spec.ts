import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AjustesControlComponent } from './ajustes-control.component';

describe('AjustesControlComponent', () => {
  let component: AjustesControlComponent;
  let fixture: ComponentFixture<AjustesControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AjustesControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjustesControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
