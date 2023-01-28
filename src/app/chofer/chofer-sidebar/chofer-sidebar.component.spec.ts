import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoferSidebarComponent } from './chofer-sidebar.component';

describe('ChoferSidebarComponent', () => {
  let component: ChoferSidebarComponent;
  let fixture: ComponentFixture<ChoferSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChoferSidebarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoferSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
