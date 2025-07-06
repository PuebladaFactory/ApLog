import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargaTableroDiarioComponent } from './carga-tablero-diario.component';

describe('CargaTableroDiarioComponent', () => {
  let component: CargaTableroDiarioComponent;
  let fixture: ComponentFixture<CargaTableroDiarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargaTableroDiarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargaTableroDiarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
