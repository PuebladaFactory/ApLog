import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferLegajoComponent } from './chofer-legajo.component';

describe('ChoferLegajoComponent', () => {
  let component: ChoferLegajoComponent;
  let fixture: ComponentFixture<ChoferLegajoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferLegajoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferLegajoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
