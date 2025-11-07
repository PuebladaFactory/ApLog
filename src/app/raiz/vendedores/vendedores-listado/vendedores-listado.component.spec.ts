import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendedoresListadoComponent } from './vendedores-listado.component';

describe('VendedoresListadoComponent', () => {
  let component: VendedoresListadoComponent;
  let fixture: ComponentFixture<VendedoresListadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendedoresListadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendedoresListadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
