import { TestBed } from '@angular/core/testing';

import { ValoresOpClienteService } from './valores-op-cliente.service';

describe('FacturacionClienteService', () => {
  let service: ValoresOpClienteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValoresOpClienteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
