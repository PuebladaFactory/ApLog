import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisibilidadListadosComponent } from './visibilidad-listados.component';

describe('VisibilidadListadosComponent', () => {
  let component: VisibilidadListadosComponent;
  let fixture: ComponentFixture<VisibilidadListadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisibilidadListadosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisibilidadListadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
