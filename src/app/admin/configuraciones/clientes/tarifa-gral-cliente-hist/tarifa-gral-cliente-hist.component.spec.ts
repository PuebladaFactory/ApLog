import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifaGralClienteHistComponent } from './tarifa-gral-cliente-hist.component';

describe('TarifaGralClienteHistComponent', () => {
  let component: TarifaGralClienteHistComponent;
  let fixture: ComponentFixture<TarifaGralClienteHistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TarifaGralClienteHistComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarifaGralClienteHistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
