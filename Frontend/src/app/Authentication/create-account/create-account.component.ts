import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { UserService } from '../../services/user.service';
import { Store } from '@ngrx/store';
import { loginSuccess } from '../../state/auth.actions';

@Component({
  selector: 'app-create-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-account.component.html',
  styleUrl: './create-account.component.css',
})
export class CreateAccountComponent implements OnInit {
  phone = '';
  verificationToken = '';
  loading = false;
  hidePass = true;
  hideConfirm = true;
  errorMessage: string | undefined;
  usernameStatus:
    | 'idle'
    | 'checking'
    | 'available'
    | 'taken'
    | 'reserved'
    | 'invalid' = 'idle';
  strength = 0;

  form = new FormGroup(
    {
      username: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_]+$/),
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
      ]),
      passwordConfirm: new FormControl('', [Validators.required]),
    },
    { validators: this.passwordsMatch },
  );

  constructor(
    private router: Router,
    private userService: UserService,
    private store: Store,
  ) {}

  ngOnInit(): void {
    this.phone = sessionStorage.getItem('reg_phone') || '';
    this.verificationToken =
      sessionStorage.getItem('reg_verification_token') || '';
    if (!this.phone || !this.verificationToken) {
      this.router.navigate(['/authentication/register']);
      return;
    }

    this.form
      .get('username')
      ?.valueChanges.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((u) => {
          const username = (u || '').trim();
          if (!username || username.length < 3) {
            this.usernameStatus = 'idle';
            return of(null);
          }
          this.usernameStatus = 'checking';
          return this.userService.checkUsername(username);
        }),
      )
      .subscribe((res) => {
        if (!res) return;
        if (res.data?.available) this.usernameStatus = 'available';
        else if (res.data?.reason === 'reserved')
          this.usernameStatus = 'reserved';
        else if (res.data?.reason === 'invalid_format')
          this.usernameStatus = 'invalid';
        else this.usernameStatus = 'taken';
      });

    this.form.get('password')?.valueChanges.subscribe((p) => {
      this.strength = this.calcStrength(p || '');
    });
  }

  passwordsMatch(group: AbstractControl) {
    const p = group.get('password')?.value;
    const c = group.get('passwordConfirm')?.value;
    return p === c ? null : { mismatch: true };
  }

  calcStrength(p: string): number {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (p.length >= 12) s++;
    return Math.min(s, 4);
  }

  get usernameStatusClass(): string {
    switch (this.usernameStatus) {
      case 'available':
        return 'text-emerald-300';
      case 'taken':
      case 'reserved':
      case 'invalid':
        return 'text-rose-400';
      case 'checking':
        return 'text-white/50';
      default:
        return '';
    }
  }

  get strengthColor(): string {
    if (this.strength <= 1) return '#f43f5e';
    if (this.strength === 2) return '#f59e0b';
    if (this.strength === 3) return '#34d399';
    return '#10b981';
  }

  get strengthLabel(): string {
    return ['خیلی ضعیف', 'ضعیف', 'متوسط', 'قوی', 'عالی'][this.strength] || '';
  }

  get canSubmit(): boolean {
    return (
      this.form.valid &&
      this.usernameStatus === 'available' &&
      this.strength >= 2 &&
      !this.loading
    );
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.loading = true;
    this.errorMessage = undefined;

    this.userService
      .registerWithPhone({
        username: (this.form.value.username || '').trim(),
        password: this.form.value.password || '',
        phone: this.phone,
        verification_token: this.verificationToken,
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          sessionStorage.removeItem('reg_phone');
          sessionStorage.removeItem('reg_verification_token');
          sessionStorage.removeItem('reg_otp_expires');

          const token = res.data?.token;
          if (token) {
            this.store.dispatch(loginSuccess({ token }));
          }
          this.router.navigate(['/authentication/complete-profile']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'ثبت‌نام ناموفق بود.';
        },
      });
  }
}
