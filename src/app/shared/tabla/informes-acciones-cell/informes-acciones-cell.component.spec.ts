import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformesAccionesCellComponent } from './informes-acciones-cell.component';

describe('InformesAccionesCellComponent', () => {
  let component: InformesAccionesCellComponent;
  let fixture: ComponentFixture<InformesAccionesCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformesAccionesCellComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformesAccionesCellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
