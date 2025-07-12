import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroLegajosComponent } from './tablero-legajos.component';

describe('TableroLegajosComponent', () => {
  let component: TableroLegajosComponent;
  let fixture: ComponentFixture<TableroLegajosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableroLegajosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableroLegajosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
