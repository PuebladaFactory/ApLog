import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesTarifaPersonalizadaComponent } from './choferes-tarifa-personalizada.component';

describe('ChoferesTarifaPersonalizadaComponent', () => {
  let component: ChoferesTarifaPersonalizadaComponent;
  let fixture: ComponentFixture<ChoferesTarifaPersonalizadaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesTarifaPersonalizadaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesTarifaPersonalizadaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
