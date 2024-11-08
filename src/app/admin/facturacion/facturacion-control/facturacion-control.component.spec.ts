import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionControlComponent } from './facturacion-control.component';

describe('FacturacionControlComponent', () => {
  let component: FacturacionControlComponent;
  let fixture: ComponentFixture<FacturacionControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacturacionControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
