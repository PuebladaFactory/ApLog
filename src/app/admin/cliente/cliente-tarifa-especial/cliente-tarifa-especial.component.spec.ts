import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteTarifaEspecialComponent } from './cliente-tarifa-especial.component';

describe('ClienteTarifaEspecialComponent', () => {
  let component: ClienteTarifaEspecialComponent;
  let fixture: ComponentFixture<ClienteTarifaEspecialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClienteTarifaEspecialComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteTarifaEspecialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
