import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargaMultipleComponent } from './carga-multiple.component';

describe('CargaMultipleComponent', () => {
  let component: CargaMultipleComponent;
  let fixture: ComponentFixture<CargaMultipleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CargaMultipleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargaMultipleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
