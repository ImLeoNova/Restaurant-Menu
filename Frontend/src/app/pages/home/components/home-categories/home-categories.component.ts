import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { CategoryMODEL } from '../../../../models/category-model';

@Component({
  selector: 'app-home-categories',
  standalone: true,
  imports: [NgClass],
  templateUrl: './home-categories.component.html',
})
export class HomeCategoriesComponent {
  @Input({ required: true }) categories!: CategoryMODEL[];
  @Input() nowCategory = '';
  @Output() categoryChange = new EventEmitter<string>();
}
