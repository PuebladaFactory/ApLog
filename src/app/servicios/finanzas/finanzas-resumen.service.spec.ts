import { TestBed } from '@angular/core/testing';

import { FinanzasResumenService } from './finanzas-resumen.service';

describe('FinanzasResumenService', () => {
  let service: FinanzasResumenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinanzasResumenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
