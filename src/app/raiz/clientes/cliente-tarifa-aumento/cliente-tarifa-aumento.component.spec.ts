import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteTarifaAumentoComponent } from './cliente-tarifa-aumento.component';

describe('ClienteTarifaAumentoComponent', () => {
  let component: ClienteTarifaAumentoComponent;
  let fixture: ComponentFixture<ClienteTarifaAumentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteTarifaAumentoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteTarifaAumentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
