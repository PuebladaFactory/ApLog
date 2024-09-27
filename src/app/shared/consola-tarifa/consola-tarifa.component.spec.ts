import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsolaTarifaComponent } from './consola-tarifa.component';

describe('ConsolaTarifaComponent', () => {
  let component: ConsolaTarifaComponent;
  let fixture: ComponentFixture<ConsolaTarifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConsolaTarifaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsolaTarifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
