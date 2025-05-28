import { Component, HostListener } from '@angular/core';

@Component({
    selector: 'app-scroll-to-top',
    templateUrl: './scroll-to-top.component.html',
    styleUrls: ['./scroll-to-top.component.scss'],
    standalone: false
})
export class ScrollToTopComponent {
  isVisible = false;

  @HostListener('window:scroll')
  checkScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isVisible = scrollPosition > 300;
  }

  scrollToTop() {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }
}
