import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanzasCobrosComponent } from './finanzas-cobros.component';

describe('FinanzasCobrosComponent', () => {
  let component: FinanzasCobrosComponent;
  let fixture: ComponentFixture<FinanzasCobrosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanzasCobrosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanzasCobrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
