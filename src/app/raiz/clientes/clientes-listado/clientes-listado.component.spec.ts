import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientesListadoComponent } from './clientes-listado.component';

describe('ListadoNuevoComponent', () => {
  let component: ClientesListadoComponent;
  let fixture: ComponentFixture<ClientesListadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientesListadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientesListadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
