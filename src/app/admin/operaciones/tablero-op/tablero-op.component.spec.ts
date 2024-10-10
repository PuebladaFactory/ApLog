import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroOpComponent } from './tablero-op.component';

describe('TableroOpComponent', () => {
  let component: TableroOpComponent;
  let fixture: ComponentFixture<TableroOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableroOpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableroOpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
