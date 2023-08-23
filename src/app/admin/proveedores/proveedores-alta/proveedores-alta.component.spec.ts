import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedoresAltaComponent } from './proveedores-alta.component';

describe('ProveedoresAltaComponent', () => {
  let component: ProveedoresAltaComponent;
  let fixture: ComponentFixture<ProveedoresAltaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProveedoresAltaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProveedoresAltaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
