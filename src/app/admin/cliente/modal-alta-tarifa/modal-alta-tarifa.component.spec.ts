import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAltaTarifaComponent } from './modal-alta-tarifa.component';

describe('ModalAltaTarifaComponent', () => {
  let component: ModalAltaTarifaComponent;
  let fixture: ComponentFixture<ModalAltaTarifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalAltaTarifaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAltaTarifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
