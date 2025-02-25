import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalFacturaComponent } from './modal-factura.component';

describe('ModalFacturaComponent', () => {
  let component: ModalFacturaComponent;
  let fixture: ComponentFixture<ModalFacturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalFacturaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalFacturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
