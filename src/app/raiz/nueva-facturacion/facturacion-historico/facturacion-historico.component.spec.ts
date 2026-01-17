import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturacionHistoricoComponent } from './facturacion-historico.component';

describe('FacturacionHistoricoComponent', () => {
  let component: FacturacionHistoricoComponent;
  let fixture: ComponentFixture<FacturacionHistoricoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturacionHistoricoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturacionHistoricoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
