import { TestBed } from '@angular/core/testing';

import { FacturacionChoferService } from './facturacion-chofer.service';

describe('FacturacionChoferService', () => {
  let service: FacturacionChoferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacturacionChoferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
