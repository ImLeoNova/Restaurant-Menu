import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { RegistrationStepperComponent } from '../registration-stepper/registration-stepper.component';

@Component({
  selector: 'app-phone-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RegistrationStepperComponent],
  templateUrl: './phone-auth.component.html',
  styleUrl: './phone-auth.component.css',
})
export class PhoneAuthComponent {
  isHover = false;
  loading = false;
  errorMessage: string | undefined;

  phoneForm = new FormGroup({
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^(0|\+98)9\d{9}$/),
    ]),
  });

  constructor(
    private router: Router,
    private userService: UserService,
  ) {}

  get phoneValid(): boolean {
    return this.phoneForm.get('phone')?.valid === true;
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/[^\d+]/g, '');
    if (v.startsWith('+98')) {
      v = '0' + v.slice(3);
    } else if (v.startsWith('98') && v.length >= 3) {
      v = '0' + v.slice(2);
    }
    if (v.length > 11) v = v.slice(0, 11);
    this.phoneForm.patchValue({ phone: v }, { emitEvent: false });
    input.value = v;
  }

  submit(): void {
    if (!this.phoneValid || this.loading) return;
    this.errorMessage = undefined;
    this.loading = true;
    const phone = (this.phoneForm.value.phone || '').trim();

    this.userService.sendOtp(phone).subscribe({
      next: (res) => {
        this.loading = false;
        sessionStorage.setItem('reg_phone', phone);
        sessionStorage.setItem(
          'reg_otp_expires',
          String(Date.now() + (res.data?.expires_in || 120) * 1000),
        );
        this.router.navigate(['/authentication/register/otp']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'ارسال کد تأیید با خطا مواجه شد.';
      },
    });
  }
}
