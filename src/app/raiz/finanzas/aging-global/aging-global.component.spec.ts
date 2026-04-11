import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgingGlobalComponent } from './aging-global.component';

describe('AgingGlobalComponent', () => {
  let component: AgingGlobalComponent;
  let fixture: ComponentFixture<AgingGlobalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgingGlobalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgingGlobalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
