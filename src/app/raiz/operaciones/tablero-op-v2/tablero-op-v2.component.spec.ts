import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroOpV2Component } from './tablero-op-v2.component';

describe('TableroOpV2Component', () => {
  let component: TableroOpV2Component;
  let fixture: ComponentFixture<TableroOpV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableroOpV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableroOpV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
