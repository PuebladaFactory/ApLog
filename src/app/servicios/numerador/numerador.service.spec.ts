import { TestBed } from '@angular/core/testing';

import { NumeradorService } from './numerador.service';

describe('NumeradorService', () => {
  let service: NumeradorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NumeradorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
