import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturarOpComponent } from './facturar-op.component';

describe('FacturarOpComponent', () => {
  let component: FacturarOpComponent;
  let fixture: ComponentFixture<FacturarOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FacturarOpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturarOpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
