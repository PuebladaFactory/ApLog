import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaLiqComponent } from './nueva-liq.component';

describe('NuevaLiqComponent', () => {
  let component: NuevaLiqComponent;
  let fixture: ComponentFixture<NuevaLiqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaLiqComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevaLiqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
