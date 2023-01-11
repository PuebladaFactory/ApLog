import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteControlComponent } from './cliente-control.component';

describe('ClienteControlComponent', () => {
  let component: ClienteControlComponent;
  let fixture: ComponentFixture<ClienteControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClienteControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
