import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalObjetosActivosComponent } from './modal-objetos-activos.component';

describe('ModalObjetosActivosComponent', () => {
  let component: ModalObjetosActivosComponent;
  let fixture: ComponentFixture<ModalObjetosActivosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalObjetosActivosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalObjetosActivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
