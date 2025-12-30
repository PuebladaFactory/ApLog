import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalChoferesNoDisponiblesComponent } from './modal-choferes-no-disponibles.component';

describe('ModalChoferesNoDisponiblesComponent', () => {
  let component: ModalChoferesNoDisponiblesComponent;
  let fixture: ComponentFixture<ModalChoferesNoDisponiblesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalChoferesNoDisponiblesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalChoferesNoDisponiblesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
