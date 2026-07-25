import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-products-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-products-header.component.html',
})
export class HomeProductsHeaderComponent {
  @Input() categoryTitle = '';
  @Input() categoryImage = '';
  @Input({ required: true }) productsCount!: number;
}
