# PostGrade End-to-End Tests

## Purpose

These Playwright tests provide frontend end-to-end coverage for the main PostGrade assessment workflow and selected failure states.

## Test environment

Frontend:
- PostGradeVue
- Branch: `issue-10-frontend-ci-e2e`
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
- Marking
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

No frontend email-failure display is currently exposed in the reviewed Vue source. Email-failure E2E coverage therefore remains dependent on the corresponding backend/frontend email workflow being available. No new email behaviour was introduced as part of this frontend testing issue.

Sandbox/test email should be used when the email workflow becomes available; the E2E fixtures must not use real student information.