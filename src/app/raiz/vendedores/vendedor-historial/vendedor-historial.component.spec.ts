import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendedorHistorialComponent } from './vendedor-historial.component';

describe('HistorialComponent', () => {
  let component: VendedorHistorialComponent;
  let fixture: ComponentFixture<VendedorHistorialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendedorHistorialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendedorHistorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
