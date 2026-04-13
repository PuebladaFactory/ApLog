import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumenOpEntidadComponent } from './resumen-op-entidad.component';

describe('ResumenOpEntidadComponent', () => {
  let component: ResumenOpEntidadComponent;
  let fixture: ComponentFixture<ResumenOpEntidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenOpEntidadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumenOpEntidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
