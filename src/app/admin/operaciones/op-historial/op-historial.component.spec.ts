import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpHistorialComponent } from './op-historial.component';

describe('OpHistorialComponent', () => {
  let component: OpHistorialComponent;
  let fixture: ComponentFixture<OpHistorialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpHistorialComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpHistorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
