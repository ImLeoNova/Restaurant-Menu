import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardReportsComponent } from '../dashboard-reports/dashboard-reports.component';
import { Roles } from '../../../../enums/enums';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, DashboardReportsComponent],
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent {
  @Input({ required: true }) productsCount!: number;
  @Input({ required: true }) categoryProductsCount!: number;
  @Input() activeCategory: string | null = null;
  @Input({ required: true }) userRole!: string;

  @Output() filterOrdersByStatus = new EventEmitter<string>();
  @Output() openOrder = new EventEmitter<number>();

  get isAdminOrFounder(): boolean {
    const r = String(this.userRole || '').toLowerCase();
    return r === 'admin' || r === 'founder';
  }
}
