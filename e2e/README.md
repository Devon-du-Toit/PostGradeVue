# PostGrade End-to-End Tests

## Purpose

These Playwright tests provide frontend end-to-end coverage for the main PostGrade assessment workflow and selected failure states.

## Test environment

Frontend:

- PostGradeVue
- Use the frontend revision under review and its coordinated backend APIs.
- Node.js 24 (the CI runtime)
- Vue 3 / Vite
- Playwright with Chromium

Backend:

- PostGradeDjango
- Local Django test environment at `http://127.0.0.1:8000`
- PostgreSQL-backed development database

The frontend uses:

`VITE_API_BASE_URL=http://127.0.0.1:8000/api/`

## Synthetic test data

The E2E tests use synthetic data only.

Lecturer:

- Email: `e2e.lecturer@example.com`

Student:

- Student number: `12345678`
- Name: Test Student
- Email: `test.student@example.com`

The synthetic submission image and CSV fixture are stored in the `e2e` directory.

## Covered workflows

The Playwright tests cover:

- Lecturer login
- Course setup
- Synthetic class-list CSV import
- Assessment creation
- Submission upload
- Recognition review
- Student verification
- Verified-script email scheduling and delivery-status review, without marks
- Invalid-login validation/error display
- Missing-session redirect
- Upload-failure display
- Basic accessibility checks for the primary login workflow

## Running the tests

Start the compatible Django backend first.

Then run:

`npx playwright test`

On Windows PowerShell where script execution is restricted, use:

`npx.cmd playwright test`

## Current dependency notes

Recognition tests require the compatible PostGradeDjango recognition backend and a configured PostgreSQL database.

Ambiguous bubble-reading behaviour depends on the backend recognition workflow. The main E2E workflow exercises the existing recognition/verification path using synthetic data.

The email-delivery spec uses the real backend outbox endpoints with synthetic records. Before starting the sandbox backend, run migrations, create the E2E lecturer, and run `POSTGRADE_EMAIL_E2E=1 python ../e2e/seed_email_fixtures.py` from the backend checkout (adjust the script path locally). This resets only the designated email scenario records; use a disposable test database. CI seeds these records automatically.

Configure `CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173` and `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` for the sandbox server. Do not run the mail worker while these tests execute: they assert queued delivery, approval, missing-address errors, provider retries, explicit duplicate confirmation, sent-record restrictions and verified script attachments and idempotent delivery requests. No mail is delivered to real addresses.

The theme spec uses synthetic API responses and checks rendered text contrast on five screens in both light and dark mode, including input focus and button/navigation hover states. It also checks theme persistence. Screenshots are written to the Playwright output directory.

The bubble-recognition spec creates a synthetic form with conflicting written digits and verifies that the selected bubble worker reads only the fills and suggests the enrolled student. It requires the backend bubble capability; it explicitly skips against an older backend where the UI disables that method. Run the recognition worker for this test. No real scripts are used.

Upload specs select **One complete script per file without QR grouping** when the
backend exposes the first-upload layout prompt. The upload-failure scenario asserts
the server's reported error and an available retry control. Formatting and E2E
failures block frontend CI; they are no longer ignored by `continue-on-error`.

The sign-up spec uses a uniquely named synthetic account against the sandbox backend. It verifies direct landing-to-form navigation, password confirmation, account creation, sign-in with the new credentials, duplicate-email feedback and responsive layouts. The backend must enable its existing registration endpoint for this test.
