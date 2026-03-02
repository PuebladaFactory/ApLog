import { TestBed } from '@angular/core/testing';

import { SaldoEngineService } from './saldo-engine.service';

describe('SaldoEngineService', () => {
  let service: SaldoEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaldoEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
