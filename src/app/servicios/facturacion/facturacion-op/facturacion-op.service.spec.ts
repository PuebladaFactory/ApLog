import { TestBed } from '@angular/core/testing';

import { FacturacionOpService } from './facturacion-op.service';

describe('FacturacionOpService', () => {
  let service: FacturacionOpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacturacionOpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
