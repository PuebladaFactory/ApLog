import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpAltaComponent } from './op-alta.component';

describe('OpAltaComponent', () => {
  let component: OpAltaComponent;
  let fixture: ComponentFixture<OpAltaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpAltaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpAltaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
