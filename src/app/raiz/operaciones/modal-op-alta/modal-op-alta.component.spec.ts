import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalOpAltaComponent } from './modal-op-alta.component';

describe('ModalOpAltaComponent', () => {
  let component: ModalOpAltaComponent;
  let fixture: ComponentFixture<ModalOpAltaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalOpAltaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalOpAltaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
