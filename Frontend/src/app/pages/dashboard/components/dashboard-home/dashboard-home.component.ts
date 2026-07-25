import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent {
  @Input({ required: true }) productsCount!: number;
  @Input({ required: true }) categoryProductsCount!: number;
  @Input() activeCategory: string | null = null;
  @Input({ required: true }) userRole!: string;
}
