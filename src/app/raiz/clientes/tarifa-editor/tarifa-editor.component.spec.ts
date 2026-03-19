import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifaEditorComponent } from './tarifa-editor.component';

describe('CrearTarifaPersonalizadaComponent', () => {
  let component: TarifaEditorComponent;
  let fixture: ComponentFixture<TarifaEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TarifaEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarifaEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
