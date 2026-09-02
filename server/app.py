"""Humsafar Wedding — Flask server.

Serves every page in frontend/pages/ at a clean endpoint:

    /                      -> frontend/pages/index.html
    /about-us              -> frontend/pages/about-us.html
    /india/goa             -> frontend/pages/india/goa.html
    /blogs/<article-slug>  -> frontend/pages/blogs/<article-slug>.html

To add a new page, just drop an .html file into frontend/pages/
(subfolders allowed) — no code change needed.

Run:
    conda activate humsafar
    python server/app.py
"""

import sys
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
PAGES_DIR = FRONTEND_DIR / "pages"
ASSETS_DIR = FRONTEND_DIR / "assets"

sys.path.insert(0, str(BASE_DIR))
from api._contact_shared import (  # noqa: E402
    EnquiryDeliveryError,
    EnquiryValidationError,
    handle_submission,
)
from api._vendor_shared import (  # noqa: E402
    EnquiryDeliveryError as VendorDeliveryError,
    EnquiryValidationError as VendorValidationError,
    handle_submission as handle_vendor_submission,
)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024  # 6 MB


@app.route("/assets/<path:filename>")
def assets(filename):
    """Static assets: css, js, images, fonts, icons, gallery, testimonials."""
    return send_from_directory(ASSETS_DIR, filename)


@app.route("/api/contact-enquiry", methods=["POST"])
def contact_enquiry():
    """Validates and emails a contact-us enquiry submission via Resend.

    Mirrors api/contact-enquiry.py (the Vercel Function used in production)
    — both call into api/_contact_shared.py so the logic lives once.
    """
    form_data = request.form.to_dict()
    file_storage = request.files.get("reference_photo")

    try:
        handle_submission(form_data, file_storage)
    except EnquiryValidationError as exc:
        return jsonify({"errors": exc.errors}), 400
    except EnquiryDeliveryError as exc:
        return jsonify({"message": str(exc)}), 502

    return jsonify({"message": "Enquiry received."}), 200


@app.route("/api/vendor-enquiry", methods=["POST"])
def vendor_enquiry():
    """Validates and emails a vendor collaboration submission via Resend.

    Mirrors api/vendor-enquiry.py (the Vercel Function used in production)
    — both call into api/_vendor_shared.py so the logic lives once.
    """
    form_data = request.form.to_dict()
    file_storage = request.files.get("portfolio_file")

    try:
        handle_vendor_submission(form_data, file_storage)
    except VendorValidationError as exc:
        return jsonify({"errors": exc.errors}), 400
    except VendorDeliveryError as exc:
        return jsonify({"message": str(exc)}), 502

    return jsonify({"message": "Enquiry received."}), 200


@app.route("/")
def home():
    return send_from_directory(PAGES_DIR, "index.html")


@app.route("/<path:slug>")
def page(slug):
    """Clean endpoint for every page in frontend/pages/."""
    slug = slug.strip("/")
    page_path = (PAGES_DIR / f"{slug}.html").resolve()

    # Block path traversal and missing pages
    if not page_path.is_relative_to(PAGES_DIR) or not page_path.is_file():
        abort(404)

    return send_from_directory(PAGES_DIR, f"{slug}.html")


@app.errorhandler(404)
def not_found(error):
    # Same 404.html that Vercel uses in production (frontend/404.html)
    custom_404 = FRONTEND_DIR / "404.html"
    if custom_404.is_file():
        return send_from_directory(FRONTEND_DIR, "404.html"), 404
    return "Page not found", 404


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=port, debug=True)
