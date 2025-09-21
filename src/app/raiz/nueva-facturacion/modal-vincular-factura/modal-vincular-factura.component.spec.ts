import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalVincularFacturaComponent } from './modal-vincular-factura.component';

describe('ModalVincularFacturaComponent', () => {
  let component: ModalVincularFacturaComponent;
  let fixture: ComponentFixture<ModalVincularFacturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalVincularFacturaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalVincularFacturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
