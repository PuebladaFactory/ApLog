import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalOpCierreComponent } from './modal-op-cierre.component';

describe('ModalOpCierreComponent', () => {
  let component: ModalOpCierreComponent;
  let fixture: ComponentFixture<ModalOpCierreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalOpCierreComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalOpCierreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
