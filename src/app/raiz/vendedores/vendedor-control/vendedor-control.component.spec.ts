import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendedorControlComponent } from './vendedor-control.component';

describe('VendedorControlComponent', () => {
  let component: VendedorControlComponent;
  let fixture: ComponentFixture<VendedorControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendedorControlComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendedorControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
