import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialClienteComponent } from './historial-cliente.component';

describe('HistorialClienteComponent', () => {
  let component: HistorialClienteComponent;
  let fixture: ComponentFixture<HistorialClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HistorialClienteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
