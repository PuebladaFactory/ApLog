import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AjustesUsuariosComponent } from './ajustes-usuarios.component';

describe('AjustesUsuariosComponent', () => {
  let component: AjustesUsuariosComponent;
  let fixture: ComponentFixture<AjustesUsuariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AjustesUsuariosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjustesUsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
