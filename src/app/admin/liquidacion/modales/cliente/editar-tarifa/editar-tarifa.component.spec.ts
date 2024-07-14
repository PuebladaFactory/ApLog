import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarTarifaComponent } from './editar-tarifa.component';

describe('EditarTarifaComponent', () => {
  let component: EditarTarifaComponent;
  let fixture: ComponentFixture<EditarTarifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditarTarifaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarTarifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
