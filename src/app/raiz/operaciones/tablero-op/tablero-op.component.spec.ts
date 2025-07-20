import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroOpComponent } from './tablero-op.component';

describe('NuevaTablaComponent', () => {
  let component: TableroOpComponent;
  let fixture: ComponentFixture<TableroOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableroOpComponent]
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
