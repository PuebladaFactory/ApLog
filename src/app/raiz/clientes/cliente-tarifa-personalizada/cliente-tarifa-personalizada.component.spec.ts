import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteTarifaPersonalizadaComponent } from './cliente-tarifa-personalizada.component';

describe('ClienteTarifaPersonalizadaComponent', () => {
  let component: ClienteTarifaPersonalizadaComponent;
  let fixture: ComponentFixture<ClienteTarifaPersonalizadaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClienteTarifaPersonalizadaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteTarifaPersonalizadaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
