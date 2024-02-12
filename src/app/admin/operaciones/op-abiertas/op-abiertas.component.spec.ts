import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpAbiertasComponent } from './op-abiertas.component';

describe('OpAbiertasComponent', () => {
  let component: OpAbiertasComponent;
  let fixture: ComponentFixture<OpAbiertasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpAbiertasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpAbiertasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
