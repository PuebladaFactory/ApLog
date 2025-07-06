import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableroDiarioComponent } from './tablero-diario.component';

describe('TableroDiarioComponent', () => {
  let component: TableroDiarioComponent;
  let fixture: ComponentFixture<TableroDiarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableroDiarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableroDiarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
