import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformesTablaComponent } from './informes-tabla.component';

describe('InformesTablaComponent', () => {
  let component: InformesTablaComponent;
  let fixture: ComponentFixture<InformesTablaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformesTablaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformesTablaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
