import { TestBed } from '@angular/core/testing';

import { ResumenBuilderService } from './resumen-builder.service';

describe('ResumenBuilderService', () => {
  let service: ResumenBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResumenBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
