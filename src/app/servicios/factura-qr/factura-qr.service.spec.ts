import { TestBed } from '@angular/core/testing';

import { FacturaQrService } from './factura-qr.service';

describe('FacturaQrService', () => {
  let service: FacturaQrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacturaQrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
