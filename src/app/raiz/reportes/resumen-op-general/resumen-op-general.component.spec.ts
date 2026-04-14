import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumenOpGeneralComponent } from './resumen-op-general.component';

describe('ResumenOpGeneralComponent', () => {
  let component: ResumenOpGeneralComponent;
  let fixture: ComponentFixture<ResumenOpGeneralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenOpGeneralComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumenOpGeneralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
