import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MigrarDatosComponent } from './migrar-datos.component';

describe('MigrarDatosComponent', () => {
  let component: MigrarDatosComponent;
  let fixture: ComponentFixture<MigrarDatosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MigrarDatosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MigrarDatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
