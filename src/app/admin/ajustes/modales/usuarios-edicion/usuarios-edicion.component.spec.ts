import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuariosEdicionComponent } from './usuarios-edicion.component';

describe('UsuariosEdicionComponent', () => {
  let component: UsuariosEdicionComponent;
  let fixture: ComponentFixture<UsuariosEdicionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UsuariosEdicionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsuariosEdicionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
