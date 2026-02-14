import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroFechasComponent } from './tablero-fechas.component';

describe('TableroFechasComponent', () => {
  let component: TableroFechasComponent;
  let fixture: ComponentFixture<TableroFechasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableroFechasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableroFechasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
