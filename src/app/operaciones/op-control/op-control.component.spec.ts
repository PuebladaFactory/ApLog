import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpControlComponent } from './op-control.component';

describe('OpControlComponent', () => {
  let component: OpControlComponent;
  let fixture: ComponentFixture<OpControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
