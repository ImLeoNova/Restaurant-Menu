import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user';
import { jwtDecode } from 'jwt-decode';
import { Store } from '@ngrx/store';
import { loginSuccess } from '../../state/auth.actions';
import { AuthState } from '../../state/app.state';
import { LoginResponse } from '../../interfaces/interfaces';
import { ApiResponse } from '../../models/api-response';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login-auth',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './login-auth.component.html',
  styleUrl: './login-auth.component.css',
})
export class LoginAuthComponent {
  isHover: boolean = false;
  errorMessage: string | undefined = undefined;
  successMessage: string | undefined = undefined;
  hidePass: boolean = true;
  loading: boolean = false;

  loginForm: FormGroup = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
    ]),
  });

  constructor(
    private userService: UserService,
    private router: Router,
    private store: Store<{ auth: AuthState }>,
    private toastService: ToastService,
  ) {}

  submit() {
    if (this.loginForm.invalid || this.loading) return;

    const username = this.loginForm.controls['username'].value;
    const password = this.loginForm.controls['password'].value;
    const userModel = new User('', username, password, '', '', '[]');

    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.loading = true;

    this.userService.loginUser(userModel).subscribe(
      (response: ApiResponse<LoginResponse>) => {
        // getting JWT token
        const token = response.data.token;

        // Decoding JWT Token
        const tokenDecode = jwtDecode(token);
        this.loading = false;
        this.successMessage = 'با موفقیت وارد شدید.';
        this.toastService.success('با موفقیت وارد شدید.');

        // Add Token To Store
        this.store.dispatch(loginSuccess({ token: token }));

        // Here we go to the login page after login
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 600);
      },
      (error) => {
        this.loading = false;
        this.successMessage = undefined;
        this.errorMessage =
          error.status === 400
            ? 'نام کاربری یا رمز عبور اشتباه است'
            : error?.error?.message ||
              'ورود با خطا مواجه شد. دوباره تلاش کنید.';
      },
    );
  }
}
