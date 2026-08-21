import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PapeleraLegadoComponent } from './papelera-legado.component';

describe('PapeleraLegadoComponent', () => {
  let component: PapeleraLegadoComponent;
  let fixture: ComponentFixture<PapeleraLegadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PapeleraLegadoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PapeleraLegadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
