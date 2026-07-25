import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-product-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-product-modal.component.html',
})
export class SearchProductModalComponent {
  @Input() searchKeyword = '';
  @Output() searchKeywordChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
}
