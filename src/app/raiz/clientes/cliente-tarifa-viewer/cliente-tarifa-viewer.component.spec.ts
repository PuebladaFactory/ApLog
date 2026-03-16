import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteTarifaViewerComponent } from './cliente-tarifa-viewer.component';

describe('ClienteTarifaViewerComponent', () => {
  let component: ClienteTarifaViewerComponent;
  let fixture: ComponentFixture<ClienteTarifaViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteTarifaViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteTarifaViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
