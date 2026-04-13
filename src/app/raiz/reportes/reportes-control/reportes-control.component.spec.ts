import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportesControlComponent } from './reportes-control.component';

describe('ReportesControlComponent', () => {
  let component: ReportesControlComponent;
  let fixture: ComponentFixture<ReportesControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesControlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportesControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
