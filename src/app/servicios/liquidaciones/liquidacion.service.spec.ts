import { TestBed } from '@angular/core/testing';

import { LiquidacionService } from './liquidacion.service';

describe('LiquidacionService', () => {
  let service: LiquidacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LiquidacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
