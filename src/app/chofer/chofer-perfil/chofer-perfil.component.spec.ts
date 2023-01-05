import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferPerfilComponent } from './chofer-perfil.component';

describe('ChoferPerfilComponent', () => {
  let component: ChoferPerfilComponent;
  let fixture: ComponentFixture<ChoferPerfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferPerfilComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferPerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
