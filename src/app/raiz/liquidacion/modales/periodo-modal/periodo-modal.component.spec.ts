import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeriodoModalComponent } from './periodo-modal.component';

describe('PeriodoModalComponent', () => {
  let component: PeriodoModalComponent;
  let fixture: ComponentFixture<PeriodoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeriodoModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PeriodoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
