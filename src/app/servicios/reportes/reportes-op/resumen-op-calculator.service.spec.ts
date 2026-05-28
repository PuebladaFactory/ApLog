import { TestBed } from '@angular/core/testing';

import { ResumenOpCalculatorService } from './resumen-op-calculator.service';

describe('ResumenOpCalculatorService', () => {
  let service: ResumenOpCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResumenOpCalculatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
