import { TestBed } from '@angular/core/testing';

import { TablaResumenConfigService } from './tabla-resumen-config.service';

describe('TablaResumenConfigService', () => {
  let service: TablaResumenConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TablaResumenConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
