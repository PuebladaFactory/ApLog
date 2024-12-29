import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarTarifaOpComponent } from './editar-tarifa-op.component';

describe('EditarTarifaOpComponent', () => {
  let component: EditarTarifaOpComponent;
  let fixture: ComponentFixture<EditarTarifaOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditarTarifaOpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarTarifaOpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
