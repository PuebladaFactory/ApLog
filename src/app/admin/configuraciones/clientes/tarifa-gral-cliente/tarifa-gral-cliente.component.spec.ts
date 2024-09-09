import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifaGralClienteComponent } from './tarifa-gral-cliente.component';

describe('TarifaGralClienteComponent', () => {
  let component: TarifaGralClienteComponent;
  let fixture: ComponentFixture<TarifaGralClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TarifaGralClienteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarifaGralClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
