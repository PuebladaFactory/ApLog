import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BtnLeerComponent } from './btn-leer.component';

describe('BtnLeerComponent', () => {
  let component: BtnLeerComponent;
  let fixture: ComponentFixture<BtnLeerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BtnLeerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BtnLeerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
