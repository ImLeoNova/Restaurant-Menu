import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../../services/loader.service';
import { UserService } from '../../services/user.service';
import { AuthState } from '../../state/app.state';
import { setProfileCompleted } from '../../state/auth.actions';
import { CompleteProfilePayload } from '../../interfaces/CompleteProfilePayload';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './complete-profile.component.html',
})
export class CompleteProfileComponent implements OnInit {
  step = 1;
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  errorMessage: string | undefined;
  successMessage: string | undefined;
  isSubmitting = false;
  isDragging = false;
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private loaderService: LoaderService,
    private router: Router,
    private store: Store<{ auth: AuthState }>,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      first_name: ['', [Validators.required, Validators.maxLength(120)]],
      last_name: ['', [Validators.required, Validators.maxLength(120)]],
      phone_number: [
        '',
        [Validators.required, Validators.pattern(/^(0|\+98)9\d{9}$/)],
      ],
      address: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(500),
        ],
      ],
      national_id: ['', [Validators.maxLength(10)]],
    });
  }

  get currentStepValid(): boolean {
    if (this.step === 1) {
      return true;
    }
    if (this.step === 2) {
      return this.form.valid;
    }
    return true;
  }

  nextStep(): void {
    if (this.step === 1) {
      this.step = 2;
      return;
    }
    if (this.step === 2 && this.form.valid) {
      this.step = 3;
    }
  }

  prevStep(): void {
    if (this.step > 1) {
      this.step -= 1;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.prepareFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.prepareFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  private prepareFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'فقط فایل‌های تصویری مجاز هستند.';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'حداکثر حجم مجاز برای آواتار ۲ مگابایت است.';
      return;
    }
    this.avatarFile = file;
    this.avatarPreview = URL.createObjectURL(file);
    this.errorMessage = undefined;
  }

  skipAvatar(): void {
    this.avatarFile = null;
    this.avatarPreview = null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'لطفاً اطلاعات را به‌درستی تکمیل کنید.';
      return;
    }

    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.isSubmitting = true;
    this.loaderService.show();

    const payload: CompleteProfilePayload = {
      first_name: this.form.value.first_name?.trim(),
      last_name: this.form.value.last_name?.trim(),
      phone_number: this.form.value.phone_number?.trim(),
      address: this.form.value.address?.trim(),
      national_id: this.form.value.national_id?.trim() || undefined,
    };

    this.userService
      .completeProfile(payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: () => {
          const upload$ = this.avatarFile
            ? this.userService.uploadAvatar(this.avatarFile)
            : null;

          if (upload$) {
            upload$.subscribe({
              next: () => {
                this.store.dispatch(setProfileCompleted({ completed: true }));
                this.successMessage = 'پروفایل شما با موفقیت تکمیل شد.';
                setTimeout(() => this.router.navigate(['/dashboard']), 700);
              },
              error: () => {
                this.store.dispatch(setProfileCompleted({ completed: true }));
                this.successMessage = 'پروفایل شما با موفقیت تکمیل شد.';
                setTimeout(() => this.router.navigate(['/dashboard']), 700);
              },
            });
            return;
          }

          this.store.dispatch(setProfileCompleted({ completed: true }));
          this.successMessage = 'پروفایل شما با موفقیت تکمیل شد.';
          setTimeout(() => this.router.navigate(['/dashboard']), 700);
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'در ثبت اطلاعات خطایی رخ داد.';
        },
      });
  }
}
