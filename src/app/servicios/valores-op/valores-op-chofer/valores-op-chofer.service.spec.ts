import { TestBed } from '@angular/core/testing';

import { ValoresOpChoferService } from './valores-op-chofer.service';

describe('FacturacionChoferService', () => {
  let service: ValoresOpChoferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValoresOpChoferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
