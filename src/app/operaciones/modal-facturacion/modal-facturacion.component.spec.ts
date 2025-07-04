import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalFacturacionComponent } from './modal-facturacion.component';

describe('ModalFacturacionComponent', () => {
  let component: ModalFacturacionComponent;
  let fixture: ComponentFixture<ModalFacturacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalFacturacionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalFacturacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
