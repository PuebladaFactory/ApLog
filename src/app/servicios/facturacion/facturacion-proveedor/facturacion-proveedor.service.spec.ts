import { TestBed } from '@angular/core/testing';

import { FacturacionProveedorService } from './facturacion-proveedor.service';

describe('FacturacionProveedorService', () => {
  let service: FacturacionProveedorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacturacionProveedorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
