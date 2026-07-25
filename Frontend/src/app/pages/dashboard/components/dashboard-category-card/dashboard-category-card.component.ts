import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { CategoryMODEL } from '../../../../models/category-model';

@Component({
  selector: 'app-dashboard-category-card',
  standalone: true,
  imports: [NgClass],
  templateUrl: './dashboard-category-card.component.html',
})
export class DashboardCategoryCardComponent {
  @Input({ required: true }) category!: CategoryMODEL;
  @Input() active = false;

  @Output() view = new EventEmitter<CategoryMODEL>();
  @Output() edit = new EventEmitter<CategoryMODEL>();
  @Output() remove = new EventEmitter<CategoryMODEL>();
}
