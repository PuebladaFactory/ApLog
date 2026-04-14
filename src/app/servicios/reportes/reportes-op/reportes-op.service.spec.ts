import { TestBed } from '@angular/core/testing';

import { ReportesOpService } from './reportes-op.service';

describe('ReportesOpService', () => {
  let service: ReportesOpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportesOpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
