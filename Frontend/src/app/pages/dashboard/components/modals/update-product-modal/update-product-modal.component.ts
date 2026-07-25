import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CategoryMODEL } from '../../../../../models/category-model';
import {
  DropDownListDirective,
  DropDownOptionSelected,
} from '../../../../../directives/drop-down-list.directive';

@Component({
  selector: 'app-update-product-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, DropDownListDirective],
  templateUrl: './update-product-modal.component.html',
})
export class UpdateProductModalComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) categories!: CategoryMODEL[];
  @Input() updateImgSRC: string | ArrayBuffer | null = null;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() imageSelected = new EventEmitter<Event>();
  @Output() submitForm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  get categoryLabel(): string {
    const value = this.form.get('foodCategory')?.value;
    return (
      this.categories.find((item) => item.category === value)?.title ||
      'انتخاب دسته‌بندی'
    );
  }

  onCategorySelected(event: DropDownOptionSelected): void {
    this.form.patchValue({ foodCategory: event.value });
    this.form.get('foodCategory')?.markAsDirty();
    this.form.get('foodCategory')?.markAsTouched();
  }
}
