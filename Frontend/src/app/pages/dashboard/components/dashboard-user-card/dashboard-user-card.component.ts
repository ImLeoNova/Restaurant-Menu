import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { User } from '../../../../models/user';
import { Roles } from '../../../../enums/enums';

@Component({
  selector: 'app-dashboard-user-card',
  standalone: true,
  imports: [NgClass],
  templateUrl: './dashboard-user-card.component.html',
})
export class DashboardUserCardComponent {
  @Input({ required: true }) user!: User;
  @Output() edit = new EventEmitter<User>();
  @Output() remove = new EventEmitter<User>();

  protected readonly Roles = Roles;
}
