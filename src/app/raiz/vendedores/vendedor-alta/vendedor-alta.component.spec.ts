import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendedorAltaComponent } from './vendedor-alta.component';

describe('VendedorAltaComponent', () => {
  let component: VendedorAltaComponent;
  let fixture: ComponentFixture<VendedorAltaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendedorAltaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendedorAltaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
