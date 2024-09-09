import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifaClienteComponent } from './tarifa-cliente.component';

describe('TarifaClienteComponent', () => {
  let component: TarifaClienteComponent;
  let fixture: ComponentFixture<TarifaClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TarifaClienteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarifaClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
