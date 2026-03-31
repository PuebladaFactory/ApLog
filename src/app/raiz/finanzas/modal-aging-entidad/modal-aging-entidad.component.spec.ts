import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalAgingEntidadComponent } from './modal-aging-entidad.component';

describe('ModalAgingEntidadComponent', () => {
  let component: ModalAgingEntidadComponent;
  let fixture: ComponentFixture<ModalAgingEntidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAgingEntidadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalAgingEntidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
