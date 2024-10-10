import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalContactoProveedoresComponent } from './modal-contacto-proveedores.component';

describe('ModalContactoProveedoresComponent', () => {
  let component: ModalContactoProveedoresComponent;
  let fixture: ComponentFixture<ModalContactoProveedoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalContactoProveedoresComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalContactoProveedoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
