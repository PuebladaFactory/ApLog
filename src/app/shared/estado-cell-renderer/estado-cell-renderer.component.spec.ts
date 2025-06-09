import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadoCellRendererComponent } from './estado-cell-renderer.component';

describe('EstadoCellRendererComponent', () => {
  let component: EstadoCellRendererComponent;
  let fixture: ComponentFixture<EstadoCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstadoCellRendererComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstadoCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
