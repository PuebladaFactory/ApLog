import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteBajaComponent } from './cliente-baja.component';

describe('ClienteBajaComponent', () => {
  let component: ClienteBajaComponent;
  let fixture: ComponentFixture<ClienteBajaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClienteBajaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteBajaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
