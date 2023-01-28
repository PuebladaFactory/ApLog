import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferHomeComponent } from './chofer-home.component';

describe('ChoferHomeComponent', () => {
  let component: ChoferHomeComponent;
  let fixture: ComponentFixture<ChoferHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferHomeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
