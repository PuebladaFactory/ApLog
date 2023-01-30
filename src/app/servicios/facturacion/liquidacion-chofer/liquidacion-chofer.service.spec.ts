import { TestBed } from '@angular/core/testing';

import { LiquidacionChoferService } from './liquidacion-chofer.service';

describe('LiquidacionChoferService', () => {
  let service: LiquidacionChoferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LiquidacionChoferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
