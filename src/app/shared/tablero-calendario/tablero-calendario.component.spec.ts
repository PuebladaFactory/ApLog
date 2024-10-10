import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroCalendarioComponent } from './tablero-calendario.component';

describe('TableroCalendarioComponent', () => {
  let component: TableroCalendarioComponent;
  let fixture: ComponentFixture<TableroCalendarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableroCalendarioComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableroCalendarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
