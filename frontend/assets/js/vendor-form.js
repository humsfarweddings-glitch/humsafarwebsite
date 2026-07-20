// Vendor Collaboration form submission — posts to the /api/vendor-enquiry
// endpoint (Flask locally, Vercel Function in production) as multipart
// form data so the optional portfolio PDF upload travels with it.
const vendorForm = document.getElementById("vendor-form");

if (vendorForm) {
  const statusEl = document.getElementById("vendor-form-status");
  const submitBtn = document.getElementById("vendor-submit-btn");

  const setStatus = (message, type) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = "form-status" + (type ? " " + type : "");
  };

  vendorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fileInput = document.getElementById("file-upload");
    if (fileInput && fileInput.files[0] && fileInput.files[0].size > 4 * 1024 * 1024) {
      setStatus("Portfolio PDF must be smaller than 4 MB.", "error");
      return;
    }

    setStatus("Sending your enquiry…", "");
    submitBtn.disabled = true;

    try {
      const response = await fetch("/api/vendor-enquiry", {
        method: "POST",
        body: new FormData(vendorForm),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (result.errors && result.errors.join(" ")) ||
          result.message ||
          "Something went wrong. Please try again.";
        setStatus(message, "error");
        return;
      }

      setStatus(
        "Thank you! We've received your enquiry and will be in touch soon.",
        "success"
      );
      vendorForm.reset();
    } catch (err) {
      setStatus(
        "Couldn't reach the server. Please check your connection and try again.",
        "error"
      );
    } finally {
      submitBtn.disabled = false;
    }
  });
}
