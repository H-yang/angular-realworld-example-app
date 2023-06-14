import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  Validators,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  ValidatorFn,
  ValidationErrors,
  AbstractControl,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { NgIf } from "@angular/common";
import { ListErrorsComponent } from "../../shared/list-errors.component";
import { Errors } from "../models/errors.model";
import { UserService } from "../services/user.service";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

interface AuthForm {
  email: FormControl<string>;
  password: FormControl<string>;
  passwordCheck?: FormControl<string | null>;
  username?: FormControl<string>;
}

@Component({
  selector: "app-auth-page",
  templateUrl: "./auth.component.html",
  imports: [RouterLink, NgIf, ListErrorsComponent, ReactiveFormsModule],
  standalone: true,
})
export class AuthComponent implements OnInit, OnDestroy {
  authType = "";
  title = "";
  errors: Errors = { errors: {} };

  isSubmitting = false;
  authForm: FormGroup<AuthForm>;
  destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly userService: UserService
  ) {
    // use FormBuilder to create a form group
    this.authForm = new FormGroup<AuthForm>(
      {
        email: new FormControl("", {
          validators: [Validators.required, Validators.email],
          nonNullable: true,
        }),
        password: new FormControl("", {
          validators: [Validators.required],
          nonNullable: true,
        }),
        passwordCheck: new FormControl("", {
          nonNullable: false,
        }),
      },
      {
        validators: [this.match("password", "passwordCheck")],
      }
    );
  }

  ngOnInit(): void {
    this.authType = this.route.snapshot.url.at(-1)!.path;
    this.title = this.authType === "login" ? "Sign in" : "Sign up";
    if (this.authType === "register") {
      this.authForm.addControl(
        "username",
        new FormControl("", {
          validators: [Validators.required],
          nonNullable: true,
        })
      );
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submitForm(): void {
    this.isSubmitting = true;
    this.errors = { errors: {} };

    let observable =
      this.authType === "login"
        ? this.userService.login(
            this.authForm.value as { email: string; password: string }
          )
        : this.userService.register(
            this.authForm.value as {
              email: string;
              password: string;
              username: string;
            }
          );

    observable.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => void this.router.navigate(["/"]),
      error: (err) => {
        this.errors = err;
        this.isSubmitting = false;
      },
    });
  }

  //todo: move this to validators
  match(controlName: string, matchControlName: string): ValidatorFn {
    return (controls: AbstractControl) => {
      if (this.authType === "login") {
        return null;
      }

      const control = controls.get(controlName);
      const matchControl = controls.get(matchControlName);

      if (!matchControl?.errors && control?.value !== matchControl?.value) {
        return { notMatch: true };
      }
      return null;
    };
  }
}
