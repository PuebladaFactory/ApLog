import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjetoPapeleraComponent } from './objeto-papelera.component';

describe('ModalObjetoComponent', () => {
  let component: ObjetoPapeleraComponent;
  let fixture: ComponentFixture<ObjetoPapeleraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ObjetoPapeleraComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObjetoPapeleraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
