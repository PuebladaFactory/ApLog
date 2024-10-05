import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalOpAbiertaComponent } from './modal-op-abierta.component';

describe('ModalOpAbiertaComponent', () => {
  let component: ModalOpAbiertaComponent;
  let fixture: ComponentFixture<ModalOpAbiertaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalOpAbiertaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalOpAbiertaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
