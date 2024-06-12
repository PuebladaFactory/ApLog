import { TestBed } from '@angular/core/testing';

import { BuscarTarifaService } from './buscar-tarifa.service';

describe('BuscarTarifaService', () => {
  let service: BuscarTarifaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BuscarTarifaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
