import { TestBed } from '@angular/core/testing';

import { DbFirestoreService } from './db-firestore.service';

describe('DbFirestoreService', () => {
  let service: DbFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
