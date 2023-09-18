import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionChoferComponent } from './facturacion-chofer.component';

describe('FacturacionChoferComponent', () => {
  let component: FacturacionChoferComponent;
  let fixture: ComponentFixture<FacturacionChoferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacturacionChoferComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionChoferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
