import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesTarifaEspecialComponent } from './choferes-tarifa-especial.component';

describe('ChoferesTarifaEspecialComponent', () => {
  let component: ChoferesTarifaEspecialComponent;
  let fixture: ComponentFixture<ChoferesTarifaEspecialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesTarifaEspecialComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesTarifaEspecialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
