import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccionesCellRendererComponent } from './acciones-cell-renderer.component';

describe('AccionesCellRendererComponent', () => {
  let component: AccionesCellRendererComponent;
  let fixture: ComponentFixture<AccionesCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccionesCellRendererComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccionesCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
