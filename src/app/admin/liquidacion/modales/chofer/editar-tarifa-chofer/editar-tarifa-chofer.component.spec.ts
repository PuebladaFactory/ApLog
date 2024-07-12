import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarTarifaChoferComponent } from './editar-tarifa-chofer.component';

describe('EditarTarifaChoferComponent', () => {
  let component: EditarTarifaChoferComponent;
  let fixture: ComponentFixture<EditarTarifaChoferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditarTarifaChoferComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarTarifaChoferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
