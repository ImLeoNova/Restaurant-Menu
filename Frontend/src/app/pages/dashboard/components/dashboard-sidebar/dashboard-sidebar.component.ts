import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { User } from '../../../../models/user';
import { Roles } from '../../../../enums/enums';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './dashboard-sidebar.component.html',
})
export class DashboardSidebarComponent {
  @Input({ required: true }) user!: User;
  @Input({ required: true }) nowPage!: string;
  @Output() pageChange = new EventEmitter<string>();

  protected readonly Roles = Roles;
}
