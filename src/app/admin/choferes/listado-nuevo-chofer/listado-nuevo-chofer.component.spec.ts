import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoNuevoChoferComponent } from './listado-nuevo-chofer.component';

describe('ListadoNuevoChoferComponent', () => {
  let component: ListadoNuevoChoferComponent;
  let fixture: ComponentFixture<ListadoNuevoChoferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoNuevoChoferComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoNuevoChoferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
