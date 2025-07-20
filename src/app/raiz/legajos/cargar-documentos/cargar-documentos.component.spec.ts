import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargarDocumentosComponent } from './cargar-documentos.component';

describe('CargarDocumentosComponent', () => {
  let component: CargarDocumentosComponent;
  let fixture: ComponentFixture<CargarDocumentosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CargarDocumentosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargarDocumentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
