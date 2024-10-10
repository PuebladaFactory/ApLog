import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedoresControlComponent } from './proveedores-control.component';

describe('ProveedoresControlComponent', () => {
  let component: ProveedoresControlComponent;
  let fixture: ComponentFixture<ProveedoresControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProveedoresControlComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProveedoresControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
