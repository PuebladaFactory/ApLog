import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteTarifaGralComponent } from './cliente-tarifa-gral.component';

describe('ClienteTarifaGralComponent', () => {
  let component: ClienteTarifaGralComponent;
  let fixture: ComponentFixture<ClienteTarifaGralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClienteTarifaGralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteTarifaGralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
