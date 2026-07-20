"""Shared validation + email-sending logic for the contact enquiry endpoint.

Imported by both api/contact-enquiry.py (Vercel Function, production) and
server/app.py (Flask dev server, local). Kept dependency-free (stdlib only)
so it never needs its own entry in requirements.txt.

A leading underscore keeps Vercel from turning this file into its own
Function — see https://vercel.com/docs/functions/runtimes/python.
"""

import base64
import json
import os
import urllib.error
import urllib.request
from html import escape

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_TO_EMAIL = "info@humsafarwedding.com"
DEFAULT_FROM_EMAIL = "Humsafar Weddings <onboarding@resend.dev>"

MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024  # 4 MB

REQUIRED_FIELDS = {
    "full_name": "Full Name",
    "contact_number": "Contact Number",
    "email": "Email",
}

# Ordered field -> label map used to render the notification email.
FIELD_LABELS = {
    "full_name": "Full Name",
    "contact_number": "Contact Number",
    "email": "Email",
    "city": "City of Residence",
    "groom_name": "Groom Name",
    "bride_name": "Bride Name",
    "relationship": "Relationship to the Couple",
    "wedding_date": "Wedding Date",
    "wedding_location": "Preferred Wedding Location",
    "room_count": "No. of Rooms",
    "guest_count": "No. of Guests",
    "budget": "Tentative Wedding Budget",
    "wedding_type": "Type of Wedding",
    "planning_help": "Needs End-to-End Planning",
    "specific_help": "Specific Service Needed",
    "heard_from": "How They Heard About Us",
}


class EnquiryValidationError(Exception):
    """Raised when the submitted enquiry is missing required data."""

    def __init__(self, errors):
        self.errors = errors
        super().__init__("; ".join(errors))


class EnquiryDeliveryError(Exception):
    """Raised when the enquiry is valid but could not be emailed out."""


def validate_enquiry(data):
    """data: dict[str, str]. Raises EnquiryValidationError if invalid."""
    errors = []
    for field, label in REQUIRED_FIELDS.items():
        if not (data.get(field) or "").strip():
            errors.append(f"{label} is required.")

    email = (data.get("email") or "").strip()
    if email and "@" not in email:
        errors.append("Email address looks invalid.")

    if errors:
        raise EnquiryValidationError(errors)


def _build_email_html(data):
    rows = []
    for field, label in FIELD_LABELS.items():
        value = (data.get(field) or "").strip() or "—"
        rows.append(
            "<tr>"
            f"<td style='padding:6px 12px;font-weight:600;white-space:nowrap'>{escape(label)}</td>"
            f"<td style='padding:6px 12px'>{escape(value)}</td>"
            "</tr>"
        )
    return (
        "<h2>New Wedding Enquiry — Humsafar Weddings</h2>"
        "<table style='border-collapse:collapse'>" + "".join(rows) + "</table>"
    )


def send_enquiry_email(data, attachment_bytes=None, attachment_filename=None):
    """Sends the enquiry via the Resend HTTP API.

    Raises EnquiryDeliveryError (not the validation error) on failure, so
    callers can distinguish "bad input" (400) from "email failed" (502).
    """
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        raise EnquiryDeliveryError(
            "RESEND_API_KEY is not configured on the server."
        )

    to_email = os.environ.get("RESEND_TO_EMAIL", DEFAULT_TO_EMAIL)
    from_email = os.environ.get("RESEND_FROM_EMAIL", DEFAULT_FROM_EMAIL)
    full_name = (data.get("full_name") or "Website Visitor").strip()
    reply_to = (data.get("email") or "").strip()

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": f"New Wedding Enquiry from {full_name}",
        "html": _build_email_html(data),
    }
    if reply_to:
        payload["reply_to"] = reply_to

    if attachment_bytes and attachment_filename:
        payload["attachments"] = [
            {
                "filename": attachment_filename,
                "content": base64.b64encode(attachment_bytes).decode("ascii"),
            }
        ]

    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        RESEND_API_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")
        raise EnquiryDeliveryError(f"Resend API error {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise EnquiryDeliveryError(f"Could not reach Resend API: {exc.reason}") from exc


def handle_submission(form_data, file_storage):
    """Shared entrypoint: validates + emails one enquiry submission.

    form_data: dict[str, str] of the form's text fields.
    file_storage: object with .filename and .read()/.getvalue() for the
        optional reference-photo upload, or None.

    Returns nothing on success; raises EnquiryValidationError or
    EnquiryDeliveryError on failure.
    """
    validate_enquiry(form_data)

    attachment_bytes = None
    attachment_filename = None
    if file_storage is not None and getattr(file_storage, "filename", ""):
        raw = file_storage.read()
        if raw:
            if len(raw) > MAX_ATTACHMENT_BYTES:
                raise EnquiryValidationError(
                    ["Reference photo must be smaller than 4 MB."]
                )
            attachment_bytes = raw
            attachment_filename = file_storage.filename

    send_enquiry_email(form_data, attachment_bytes, attachment_filename)
