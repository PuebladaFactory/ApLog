import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RankingMorososComponent } from './ranking-morosos.component';

describe('RankingMorososComponent', () => {
  let component: RankingMorososComponent;
  let fixture: ComponentFixture<RankingMorososComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RankingMorososComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RankingMorososComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
