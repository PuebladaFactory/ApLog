import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListadoNuevoComponent } from './listado-nuevo.component';

describe('ListadoNuevoComponent', () => {
  let component: ListadoNuevoComponent;
  let fixture: ComponentFixture<ListadoNuevoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListadoNuevoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListadoNuevoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
