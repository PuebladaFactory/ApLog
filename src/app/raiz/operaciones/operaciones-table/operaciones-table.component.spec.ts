import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperacionesTableComponent } from './operaciones-table.component';

describe('OperacionesTableComponent', () => {
  let component: OperacionesTableComponent;
  let fixture: ComponentFixture<OperacionesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperacionesTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperacionesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
