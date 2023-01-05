import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferOperacionComponent } from './chofer-operacion.component';

describe('ChoferOperacionComponent', () => {
  let component: ChoferOperacionComponent;
  let fixture: ComponentFixture<ChoferOperacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferOperacionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferOperacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
