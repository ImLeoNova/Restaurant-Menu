import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RegistrationStep {
  id: number;
  label: string;
}

/**
 * Shared, premium progress stepper for the registration flow
 * (Phone -> OTP -> Create Account -> Complete Profile).
 * Each registration page passes its own step number as `currentStep`,
 * so step state stays correct as the user navigates between pages/routes.
 */
@Component({
  selector: 'app-registration-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './registration-stepper.component.html',
  styleUrl: './registration-stepper.component.css',
})
export class RegistrationStepperComponent {
  @Input() currentStep = 1;

  readonly steps: RegistrationStep[] = [
    { id: 1, label: 'شماره موبایل' },
    { id: 2, label: 'کد تأیید' },
    { id: 3, label: 'ایجاد حساب' },
    { id: 4, label: 'تکمیل پروفایل' },
  ];
}
