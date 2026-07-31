import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-otp-auth',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './otp-auth.component.html',
  styleUrl: './otp-auth.component.css',
})
export class OtpAuthComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = ['', '', '', '', '', ''];
  phone = '';
  loading = false;
  success = false;
  errorMessage: string | undefined;
  shake = false;
  countdown = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private otpAbort?: AbortController;

  constructor(
    private router: Router,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.phone = sessionStorage.getItem('reg_phone') || '';
    if (!this.phone) {
      this.router.navigate(['/authentication/register']);
      return;
    }
    const exp = Number(sessionStorage.getItem('reg_otp_expires') || 0);
    this.countdown = Math.max(0, Math.floor((exp - Date.now()) / 1000));
    if (this.countdown <= 0) this.countdown = 0;
    this.startTimer();
    this.setupWebOTP();
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.otpAbort?.abort();
  }

  private startTimer(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.countdown > 0) this.countdown -= 1;
      else if (this.timerId) clearInterval(this.timerId);
    }, 1000);
  }

  private setupWebOTP(): void {
    if (!('OTPCredential' in window)) return;
    try {
      this.otpAbort = new AbortController();
      const options: CredentialRequestOptions = {
        signal: this.otpAbort.signal,
      };
      // WebOTP is not in standard DOM types yet
      (options as any).otp = { transport: ['sms'] };
      navigator.credentials
        .get(options)
        .then((cred: Credential | null) => {
          const code = (cred as any)?.code;
          if (code) this.fillOtp(String(code));
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }
  fillOtp(code: string): void {
    const cleaned = code.replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < 6; i++) this.digits[i] = cleaned[i] || '';
    if (cleaned.length === 6) this.verify();
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1);
    this.digits[index] = val;
    input.value = val;
    if (val && index < 5) {
      this.otpInputs.get(index + 1)?.nativeElement.focus();
    }
    if (this.digits.every((d) => d.length === 1)) this.verify();
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.otpInputs.get(index - 1)?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    this.fillOtp(text);
  }

  get code(): string {
    return this.digits.join('');
  }

  verify(): void {
    if (this.loading || this.success || this.code.length !== 6) return;
    this.loading = true;
    this.errorMessage = undefined;
    this.shake = false;

    this.userService.verifyOtp(this.phone, this.code).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = true;
        const token = res.data?.verification_token;
        if (token) {
          sessionStorage.setItem('reg_verification_token', token);
          sessionStorage.setItem('reg_phone', res.data?.phone || this.phone);
        }
        setTimeout(
          () => this.router.navigate(['/authentication/register/account']),
          600,
        );
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'کد تأیید نادرست است.';
        this.shake = true;
        setTimeout(() => (this.shake = false), 500);
        this.digits = ['', '', '', '', '', ''];
        this.otpInputs.first?.nativeElement.focus();
      },
    });
  }

  resend(): void {
    if (this.countdown > 0 || this.loading) return;
    this.loading = true;
    this.errorMessage = undefined;
    this.userService.sendOtp(this.phone).subscribe({
      next: (res) => {
        this.loading = false;
        this.countdown = res.data?.expires_in || 120;
        sessionStorage.setItem(
          'reg_otp_expires',
          String(Date.now() + this.countdown * 1000),
        );
        this.startTimer();
        this.setupWebOTP();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'ارسال مجدد ناموفق بود.';
      },
    });
  }
}
