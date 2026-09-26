# P1-A · Auth: signup, OTP password reset, profile

**Person 1 · branch `p1/features` · target 10:00–11:00**

Read `AGENTS.md` and `docs/CONTRACT.md` (especially §5.1, §5.2 `lib/auth.ts` + `lib/mailer.ts`, §5.5 and §6.4 `AuthProvider`) before starting.

**You own only:** `server/src/modules/auth/`, `client/src/features/auth/`, `client/src/features/profile/`.

The foundation already provides working `POST /api/auth/login` and `GET /api/auth/me`, plus a working `LoginPage`. **Keep their behaviour and response shapes unchanged.**

## Server: `modules/auth/` (`routes.ts`, `service.ts`, `schemas.ts`)

Store emails trimmed and lowercased. Use `passwordSchema` from `lib/auth` for every new password.

| Endpoint | Auth | Body | Result |
|---|---|---|---|
| `POST /signup` | public | `{ name (2–80), email, password, role? ("MANAGER" \| "STAFF", default "STAFF") }` | 201 `{ token, user }`. Duplicate email → 409 CONFLICT "An account with this email already exists". |
| `PATCH /me` | requireAuth | `{ name?, email? }` (at least one) | Updated `PublicUser`. Email taken → 409 CONFLICT. |
| `POST /change-password` | requireAuth | `{ currentPassword, newPassword }` | `{ message }`. Wrong current password → **400** VALIDATION_ERROR with `fieldErrors.currentPassword`. New = current → 400. |
| `POST /forgot-password` | public | `{ email }` | **Always** 200 `{ message: "If an account exists for this email, a code has been sent." }` |
| `POST /verify-otp` | public | `{ email, otp (exactly 6 digits) }` | `{ valid: true }`. Does not consume the code. |
| `POST /reset-password` | public | `{ email, otp, newPassword }` | `{ message: "Password updated. You can now log in." }` |

### OTP rules (`PasswordResetOtp`)

**forgot-password**
- If the user exists and no unused OTP was created in the last 30 seconds:
  - mark all their unused OTPs used;
  - create a new code with `crypto.randomInt(0, 1_000_000)`, zero-padded to 6 digits;
  - store only its bcrypt hash (`hashPassword`), with `expiresAt` = now + 10 minutes;
  - `sendMail` with subject "Your StockSense password reset code" and a text containing the code and the expiry.
- Unknown emails get the same 200 response and nothing happens.

**verify-otp and reset-password** share one checking function, applied to the user's latest unused OTP:
- No user or no OTP → 400 OTP_INVALID "Invalid or expired code".
- Expired → 400 OTP_EXPIRED "This code has expired. Request a new one."
- `attempts >= 5` → mark it used → 400 OTP_INVALID "Too many attempts. Request a new code."
- Wrong code → increment `attempts` → 400 OTP_INVALID "Incorrect code".

**reset-password**, after the check: update `passwordHash` and mark the OTP used, both in one transaction.

## Client

**`features/auth/pages/SignupPage.tsx`**
- Fields: name, email, password, confirm password, and a role select ("Inventory Manager" / "Warehouse Staff").
- Show the password rules as helper text.
- On success, call `login(token, user)` and navigate to `/dashboard`.
- Link back to `/login`.

**`features/auth/pages/ForgotPasswordPage.tsx`**: three steps on one page, with a small step indicator.
1. **Email** → `forgot-password`.
2. **Code:** a 6-digit input → `verify-otp`. Include a "Resend code" button with a 30-second countdown, and a "Use a different email" link. In dev only, show the hint "Email not configured? The code is printed in the server console."
3. **New password + confirm** → `reset-password` → a success state with a button to `/login`.

Keep each step's value in component state, so going back doesn't lose it.

**`features/auth/pages/LoginPage.tsx`** (polish only; keep the working logic): add a show/hide password toggle, "Forgot password?" placement next to the password label, and a loading state on the button.

**`features/profile/pages/ProfilePage.tsx`**
- **Profile card:** avatar initials, role badge (read-only), member since, and an editable name and email → `PATCH /me` → `refreshUser()` → toast.
- **Change password card:** current, new and confirm fields. Show the server's field error under "current password". Reset the form on success.

Put feature-local components, hooks and Zod schemas inside `features/auth/` or `features/profile/`. Reuse `emailSchema` and `passwordSchema` from `@/lib/validation`.

## Verify

1. `npm run check` passes.
2. Run these API calls:
   - signup: new user → 201; same email again → 409; weak password → 400 with `fieldErrors.password`.
   - forgot-password for a real email and an unknown one: both 200. The OTP appears in the server console only for the real one.
   - verify with a wrong code 5 times → the 5th says "Too many attempts". Request a new code; the correct code verifies.
   - reset-password → log in with the new password works and the old one fails. Reusing the same OTP → 400.
   - change-password with a wrong current password → 400 (and the client does NOT get logged out).
   - `PATCH /me` changes the name; `GET /me` reflects it.
3. In the browser (desktop and 375px):
   - sign up → land on the dashboard;
   - log out → run the full forgot-password flow → log in;
   - edit the profile name → the sidebar name updates without a reload.
4. `git status` shows changes only in your three folders. Then commit `auth: signup, otp reset, profile` and report.
