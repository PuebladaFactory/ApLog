import { TestBed } from '@angular/core/testing';

import { LiquidacionBuilderService } from './liquidacion-builder.service';

describe('LiquidacionBuilderService', () => {
  let service: LiquidacionBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LiquidacionBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
