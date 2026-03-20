import { TestBed } from '@angular/core/testing';

import { CuentaCorrienteService } from './cuenta-corriente.service';

describe('CuentaCorrienteService', () => {
  let service: CuentaCorrienteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuentaCorrienteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
