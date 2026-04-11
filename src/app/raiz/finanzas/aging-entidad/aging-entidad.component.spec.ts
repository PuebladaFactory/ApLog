import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgingEntidadComponent } from './aging-entidad.component';

describe('ModalAgingEntidadComponent', () => {
  let component: AgingEntidadComponent;
  let fixture: ComponentFixture<AgingEntidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgingEntidadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgingEntidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
