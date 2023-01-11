import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesBajaComponent } from './choferes-baja.component';

describe('ClienteBajaComponent', () => {
  let component: ChoferesBajaComponent;
  let fixture: ComponentFixture<ChoferesBajaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesBajaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesBajaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
