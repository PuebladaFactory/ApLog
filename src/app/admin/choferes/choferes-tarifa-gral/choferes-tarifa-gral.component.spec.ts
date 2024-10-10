import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesTarifaGralComponent } from './choferes-tarifa-gral.component';

describe('ChoferesTarifaGralComponent', () => {
  let component: ChoferesTarifaGralComponent;
  let fixture: ComponentFixture<ChoferesTarifaGralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesTarifaGralComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesTarifaGralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
