import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferesListadoComponent } from './choferes-listado.component';

describe('ClienteListadoComponent', () => {
  let component: ChoferesListadoComponent;
  let fixture: ComponentFixture<ChoferesListadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferesListadoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferesListadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
