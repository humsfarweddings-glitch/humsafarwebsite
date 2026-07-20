// Contact / Enquiry form submission — posts to the /api/contact-enquiry
// endpoint (Flask locally, Vercel Function in production) as multipart
// form data so the optional reference-photo upload travels with it.
const enquiryForm = document.getElementById("enquiry-form");

if (enquiryForm) {
  const statusEl = document.getElementById("enquiry-form-status");
  const submitBtn = document.getElementById("enquiry-submit-btn");

  const setStatus = (message, type) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = "form-status" + (type ? " " + type : "");
  };

  enquiryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fileInput = document.getElementById("file-upload");
    if (fileInput && fileInput.files[0] && fileInput.files[0].size > 4 * 1024 * 1024) {
      setStatus("Reference photo must be smaller than 4 MB.", "error");
      return;
    }

    setStatus("Sending your enquiry…", "");
    submitBtn.disabled = true;

    try {
      const response = await fetch("/api/contact-enquiry", {
        method: "POST",
        body: new FormData(enquiryForm),
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
        "Thank you! Your enquiry has been sent — our team will reach out shortly.",
        "success"
      );
      enquiryForm.reset();
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
