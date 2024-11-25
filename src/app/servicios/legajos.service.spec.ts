import { TestBed } from '@angular/core/testing';

import { LegajosService } from './legajos.service';

describe('LegajosService', () => {
  let service: LegajosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegajosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
