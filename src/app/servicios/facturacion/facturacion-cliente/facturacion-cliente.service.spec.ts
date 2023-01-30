import { TestBed } from '@angular/core/testing';

import { FacturacionClienteService } from './facturacion-cliente.service';

describe('FacturacionClienteService', () => {
  let service: FacturacionClienteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacturacionClienteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
