import { TestBed } from '@angular/core/testing';

import { FormatoNumericoService } from './formato-numerico.service';

describe('FormatoNumericoService', () => {
  let service: FormatoNumericoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormatoNumericoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
