import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanzasPagosComponent } from './finanzas-pagos.component';

describe('FinanzasPagosComponent', () => {
  let component: FinanzasPagosComponent;
  let fixture: ComponentFixture<FinanzasPagosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanzasPagosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanzasPagosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
