import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalObjetoComponent } from './modal-objeto.component';

describe('ModalObjetoComponent', () => {
  let component: ModalObjetoComponent;
  let fixture: ComponentFixture<ModalObjetoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalObjetoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalObjetoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
