"""Vercel Function: POST /api/vendor-enquiry

A standalone Flask app is the Vercel Python entrypoint convention — each
.py file under /api that defines a top-level `app` (WSGI/ASGI) becomes its
own Function. See https://vercel.com/docs/functions/runtimes/python.

Mirrors the local Flask route in server/app.py; both call into
_vendor_shared.py so validation/email logic lives in exactly one place.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from flask import Flask, jsonify, request

from _vendor_shared import EnquiryDeliveryError, EnquiryValidationError, handle_submission

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024  # 6 MB


@app.route("/api/vendor-enquiry", methods=["POST"])
def vendor_enquiry():
    form_data = request.form.to_dict()
    file_storage = request.files.get("portfolio_file")

    try:
        handle_submission(form_data, file_storage)
    except EnquiryValidationError as exc:
        return jsonify({"errors": exc.errors}), 400
    except EnquiryDeliveryError as exc:
        return jsonify({"message": str(exc)}), 502

    return jsonify({"message": "Enquiry received."}), 200
