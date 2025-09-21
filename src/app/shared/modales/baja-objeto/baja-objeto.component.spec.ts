import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BajaObjetoComponent } from './baja-objeto.component';

describe('ModalBajaComponent', () => {
  let component: BajaObjetoComponent;
  let fixture: ComponentFixture<BajaObjetoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BajaObjetoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BajaObjetoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
