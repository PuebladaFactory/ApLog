import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalResumenOpComponent } from './modal-resumen-op.component';

describe('ModalFacturacionComponent', () => {
  let component: ModalResumenOpComponent;
  let fixture: ComponentFixture<ModalResumenOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalResumenOpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalResumenOpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
