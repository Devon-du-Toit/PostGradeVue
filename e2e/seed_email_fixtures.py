"""Run from the sandbox backend checkout after migrations and lecturer creation."""
import os
import sys
from pathlib import Path

if os.environ.get("POSTGRADE_EMAIL_E2E") != "1":
    raise SystemExit("Set POSTGRADE_EMAIL_E2E=1 only for the disposable E2E database.")
sys.path.insert(0, str(Path.cwd()))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from django.db import transaction
from django.test import override_settings
from django.utils import timezone
from accounts.models import User
from assessments.models import Assessment, Result
from courses.models import Course
from distribution.models import ResultEmail
from distribution.services import schedule_result_email
from students.models import Enrollment, Student

with transaction.atomic(), override_settings(RESULT_EMAIL_RELEASE_POLICY="approval"):
    owner = User.objects.get(email="e2e.lecturer@example.com")
    course, _ = Course.objects.get_or_create(owner=owner, code="EMAIL-E2E", year=2026, semester=2, defaults={"name": "Sandbox email delivery"})
    assessment, _ = Assessment.objects.get_or_create(course=course, name="Email delivery sandbox", defaults={"max_mark": 100, "weight": 10, "date": "2026-10-06"})
    scenarios = [
        ("90000001", "approval", "", "awaiting_approval"),
        ("90000002", "missing", "missing_recipient", "failed"),
        ("90000003", "provider", "provider_error", "failed"),
        ("90000004", "unknown", "delivery_unknown", "failed"),
        ("90000005", "sent", "", "sent"),
    ]
    for number, name, reason, status in scenarios:
        student, _ = Student.objects.get_or_create(owner=owner, student_number=number, defaults={"first_name": name, "last_name": "Synthetic", "email": "" if name == "missing" else f"{name}@example.invalid"})
        enrollment, _ = Enrollment.objects.get_or_create(course=course, student=student)
        result, _ = Result.objects.get_or_create(assessment=assessment, enrollment=enrollment, defaults={"mark": 75})
        ResultEmail.objects.filter(result=result).delete()
        Result.objects.filter(pk=result.pk).update(mark=75, version=1)
        result.refresh_from_db()
        email = schedule_result_email(result)
        email.status = status
        email.failure_reason = reason
        email.sent_at = timezone.now() if status == "sent" else None
        email.save()
    print(f"Synthetic email assessment: {assessment.pk}")
