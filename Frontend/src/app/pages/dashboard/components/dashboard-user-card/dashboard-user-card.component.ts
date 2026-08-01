import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { User } from '../../../../models/user';
import { Roles } from '../../../../enums/enums';
import { UserAvatarPipe, UserContactPipe } from '../../../../pipes/user-display.pipe';

@Component({
  selector: 'app-dashboard-user-card',
  standalone: true,
  imports: [NgClass, UserAvatarPipe, UserContactPipe],
  templateUrl: './dashboard-user-card.component.html',
})
export class DashboardUserCardComponent {
  @Input({ required: true }) user!: User;
  @Output() edit = new EventEmitter<User>();
  @Output() remove = new EventEmitter<User>();

  protected readonly Roles = Roles;
}
