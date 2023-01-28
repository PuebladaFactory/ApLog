import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpDiariasComponent } from './op-diarias.component';

describe('OpDiariasComponent', () => {
  let component: OpDiariasComponent;
  let fixture: ComponentFixture<OpDiariasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpDiariasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpDiariasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
