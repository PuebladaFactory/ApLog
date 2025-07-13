import { TestBed } from '@angular/core/testing';

import { TableroService } from './tablero.service';

describe('TableroService', () => {
  let service: TableroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TableroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
