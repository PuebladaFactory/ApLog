import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalChoferesComponent } from './modal-choferes.component';

describe('ModalChoferesComponent', () => {
  let component: ModalChoferesComponent;
  let fixture: ComponentFixture<ModalChoferesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalChoferesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalChoferesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
