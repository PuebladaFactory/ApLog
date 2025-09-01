import { TestBed } from '@angular/core/testing';

import { SupabaseStorageService } from './supabase-storage.service';

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupabaseStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
