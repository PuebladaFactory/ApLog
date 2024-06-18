import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalInformesClienteComponent } from './modal-informes-cliente.component';

describe('ModalInformesClienteComponent', () => {
  let component: ModalInformesClienteComponent;
  let fixture: ComponentFixture<ModalInformesClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalInformesClienteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalInformesClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
