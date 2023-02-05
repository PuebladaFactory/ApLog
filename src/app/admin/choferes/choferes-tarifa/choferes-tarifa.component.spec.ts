import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesTarifaComponent } from './choferes-tarifa.component';

describe('ChoferesTarifaComponent', () => {
  let component: ChoferesTarifaComponent;
  let fixture: ComponentFixture<ChoferesTarifaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesTarifaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesTarifaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
