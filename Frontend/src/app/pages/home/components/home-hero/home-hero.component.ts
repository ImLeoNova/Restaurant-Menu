import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-hero.component.html',
})
export class HomeHeroComponent {
  @Input({ required: true }) categoriesCount!: number;
  @Input({ required: true }) activeProductsCount!: number;

  scrollToAbout(): void {
    document
      .getElementById('about-us')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
