import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpCargaManualComponent } from './op-carga-manual.component';

describe('OpCargaManualComponent', () => {
  let component: OpCargaManualComponent;
  let fixture: ComponentFixture<OpCargaManualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OpCargaManualComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpCargaManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
