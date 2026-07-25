import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../models/user';
import { DashboardUserCardComponent } from '../dashboard-user-card/dashboard-user-card.component';

@Component({
  selector: 'app-dashboard-users',
  standalone: true,
  imports: [FormsModule, DashboardUserCardComponent],
  templateUrl: './dashboard-users.component.html',
})
export class DashboardUsersComponent {
  @Input({ required: true }) users!: User[];
  @Input() isLoading = false;
  @Input() searchKeyword = '';

  @Output() searchKeywordChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() editUser = new EventEmitter<User>();
  @Output() deleteUser = new EventEmitter<User>();

  onSearchInput(value: string): void {
    this.searchKeywordChange.emit(value);
    this.search.emit();
  }
}
