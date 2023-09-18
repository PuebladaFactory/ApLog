import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpCerradasComponent } from './op-cerradas.component';

describe('OpCerradasComponent', () => {
  let component: OpCerradasComponent;
  let fixture: ComponentFixture<OpCerradasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpCerradasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpCerradasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
