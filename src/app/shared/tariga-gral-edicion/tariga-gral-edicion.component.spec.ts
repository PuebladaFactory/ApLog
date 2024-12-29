import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TarigaGralEdicionComponent } from './tariga-gral-edicion.component';

describe('TarigaGralEdicionComponent', () => {
  let component: TarigaGralEdicionComponent;
  let fixture: ComponentFixture<TarigaGralEdicionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TarigaGralEdicionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TarigaGralEdicionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
