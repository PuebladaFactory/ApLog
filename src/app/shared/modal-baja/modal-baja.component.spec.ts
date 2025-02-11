import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalBajaComponent } from './modal-baja.component';

describe('ModalBajaComponent', () => {
  let component: ModalBajaComponent;
  let fixture: ComponentFixture<ModalBajaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalBajaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalBajaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
