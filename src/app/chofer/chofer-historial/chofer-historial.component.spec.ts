import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferHistorialComponent } from './chofer-historial.component';

describe('ChoferHistorialComponent', () => {
  let component: ChoferHistorialComponent;
  let fixture: ComponentFixture<ChoferHistorialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferHistorialComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferHistorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
