import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarifaChoferComponent } from './tarifa-chofer.component';

describe('TarifaChoferComponent', () => {
  let component: TarifaChoferComponent;
  let fixture: ComponentFixture<TarifaChoferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TarifaChoferComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarifaChoferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
