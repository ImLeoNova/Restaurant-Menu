import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';
import { User } from '../../../../models/user';
import { Roles } from '../../../../enums/enums';

@Component({
  selector: 'app-dashboard-welcome-header',
  standalone: true,
  imports: [NgClass],
  templateUrl: './dashboard-welcome-header.component.html',
})
export class DashboardWelcomeHeaderComponent {
  @Input({ required: true }) user!: User;
  @Output() logoutClick = new EventEmitter<void>();

  protected readonly Roles = Roles;
}
