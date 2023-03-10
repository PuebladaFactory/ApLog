import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteTarifaComponent } from './cliente-tarifa.component';

describe('ClienteTarifaComponent', () => {
  let component: ClienteTarifaComponent;
  let fixture: ComponentFixture<ClienteTarifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClienteTarifaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteTarifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
