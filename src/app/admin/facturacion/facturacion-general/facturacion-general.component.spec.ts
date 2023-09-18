import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionGeneralComponent } from './facturacion-general.component';

describe('FacturacionGeneralComponent', () => {
  let component: FacturacionGeneralComponent;
  let fixture: ComponentFixture<FacturacionGeneralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacturacionGeneralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionGeneralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
