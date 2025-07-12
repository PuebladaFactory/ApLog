import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumenOpLiquidadasComponent } from './resumen-op-liquidadas.component';

describe('FacturarOpComponent', () => {
  let component: ResumenOpLiquidadasComponent;
  let fixture: ComponentFixture<ResumenOpLiquidadasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResumenOpLiquidadasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumenOpLiquidadasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
