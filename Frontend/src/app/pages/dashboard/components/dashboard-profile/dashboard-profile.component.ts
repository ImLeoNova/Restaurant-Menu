import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { UserService } from '../../../../services/user.service';
import { LoaderService } from '../../../../services/loader.service';
import { User } from '../../../../models/user';
import { UpdateProfilePayload } from '../../../../interfaces/UpdateProfilePayload';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dashboard-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-profile.component.html',
})
export class DashboardProfileComponent implements OnInit {
  profile: User | null = null;
  form: FormGroup = new FormGroup({
    first_name: new FormControl('', [Validators.maxLength(120)]),
    last_name: new FormControl('', [Validators.maxLength(120)]),
    phone_number: new FormControl('', [this.phoneValidator]),
    address: new FormControl('', [this.addressValidator]),
    national_id: new FormControl('', [this.nationalIdValidator]),
  });

  errorMessage: string | undefined;
  successMessage: string | undefined;
  isSubmitting = false;
  isLoading = true;

  avatarFile: File | null = null;
  avatarPreviewUrl: string | null = null;

  constructor(
    private userService: UserService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.loaderService.show();

    this.userService.getMyProfile().subscribe({
      next: (response) => {
        this.profile = response.data;
        this.patchForm(response.data);
        this.userService.setCurrentAvatarUrl(
          this.buildAvatarUrl(response.data),
        );
        this.isLoading = false;
        this.loaderService.hide();
      },
      error: () => {
        this.errorMessage = 'بارگذاری پروفایل با خطا مواجه شد.';
        this.isLoading = false;
        this.loaderService.hide();
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreviewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadAvatar(): void {
    if (!this.avatarFile) return;

    this.isSubmitting = true;
    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.loaderService.show();

    this.userService.uploadAvatar(this.avatarFile).subscribe({
      next: (response) => {
        const updatedProfile = {
          ...(this.profile || ({} as User)),
          avatar: response.data.avatar,
        } as User;
        this.profile = updatedProfile;
        this.userService.setCurrentAvatarUrl(
          this.buildAvatarUrl(updatedProfile),
        );
        this.avatarFile = null;
        this.avatarPreviewUrl = null;
        this.successMessage = 'عکس پروفایل با موفقیت به‌روزرسانی شد.';
        this.isSubmitting = false;
        this.loaderService.hide();
      },
      error: () => {
        this.errorMessage = 'بارگذاری تصویر با خطا مواجه شد.';
        this.isSubmitting = false;
        this.loaderService.hide();
      },
    });
  }

  removeAvatar(): void {
    this.isSubmitting = true;
    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.loaderService.show();

    this.userService.deleteAvatar().subscribe({
      next: () => {
        if (this.profile) {
          this.profile = { ...this.profile, avatar: '' } as User;
          this.userService.setCurrentAvatarUrl(null);
        }
        this.successMessage = 'عکس پروفایل حذف شد.';
        this.isSubmitting = false;
        this.loaderService.hide();
      },
      error: () => {
        this.errorMessage = 'حذف تصویر با خطا مواجه شد.';
        this.isSubmitting = false;
        this.loaderService.hide();
      },
    });
  }

  saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'لطفاً اطلاعات وارد‌شده را بررسی کنید.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.loaderService.show();

    const payload: UpdateProfilePayload = {};
    const values = this.form.getRawValue();

    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        (payload as Record<string, string>)[key] = value.trim();
      }
    });

    this.userService.updateProfile(null, payload).subscribe({
      next: (response) => {
        this.profile = response.data;
        this.patchForm(response.data);
        this.userService.setCurrentAvatarUrl(
          this.buildAvatarUrl(response.data),
        );
        this.successMessage = 'پروفایل با موفقیت ذخیره شد.';
        this.isSubmitting = false;
        this.loaderService.hide();
      },
      error: () => {
        this.errorMessage = 'ذخیره پروفایل با خطا مواجه شد.';
        this.isSubmitting = false;
        this.loaderService.hide();
      },
    });
  }

  private patchForm(profile: User | null): void {
    this.form.patchValue({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone_number: profile?.phone_number || '',
      address: profile?.address || '',
      national_id: profile?.national_id || '',
    });
  }

  getAvatarSource(): string | null {
    if (this.avatarPreviewUrl) return this.avatarPreviewUrl;
    return this.buildAvatarUrl(this.profile);
  }

  getInitials(): string {
    const first = (this.profile?.first_name || '').trim();
    const last = (this.profile?.last_name || '').trim();
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    return (this.profile?.username || 'ک').charAt(0).toUpperCase();
  }

  private buildAvatarUrl(profile: User | null): string | null {
    if (!profile?.avatar) return null;
    return `${environment.websiteAPI}/api/user/avatar/${profile.user_ID}`;
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    if (!value) return null;
    return /^(0|\+98)9\d{9}$/.test(value) ? null : { invalidPhone: true };
  }

  private nationalIdValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const value = control.value || '';
    if (!value) return null;
    if (!/^\d{10}$/.test(value)) return { invalidNationalId: true };
    const check = Number(value[9]);
    const sum = Array.from(value.slice(0, 9)).reduce<number>(
      (acc, char, index) => acc + Number(char) * (10 - index),
      0,
    );
    const remainder = sum % 11;
    const expected = remainder < 2 ? remainder : 11 - remainder;
    return check === expected ? null : { invalidNationalId: true };
  }

  private addressValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '').trim();
    if (!value) return null;
    return value.length >= 5 && value.length <= 500
      ? null
      : { invalidAddress: true };
  }
}
