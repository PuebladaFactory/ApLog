import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiqClienteComponent } from './liq-cliente.component';

describe('LiqClienteComponent', () => {
  let component: LiqClienteComponent;
  let fixture: ComponentFixture<LiqClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiqClienteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiqClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
