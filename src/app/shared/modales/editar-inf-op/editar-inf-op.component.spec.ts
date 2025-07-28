import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarInfOpComponent } from './editar-inf-op.component';

describe('EditarInfOpComponent', () => {
  let component: EditarInfOpComponent;
  let fixture: ComponentFixture<EditarInfOpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarInfOpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarInfOpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
