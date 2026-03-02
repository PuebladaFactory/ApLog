import { TestBed } from '@angular/core/testing';

import { MovimientoFinancieroService } from './movimiento-financiero.service';

describe('MovimientoFinancieroService', () => {
  let service: MovimientoFinancieroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MovimientoFinancieroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
