import { upload } from 'https://esm.sh/@vercel/blob@2.6.1/client';

const form = document.getElementById('career-form');
if (form) {
  const submitBtn = form.querySelector('button.submit-btn');
  const statusEl = document.getElementById('career-form-status');
  const fileInput = document.getElementById('cv-file');
  const fileNameEl = document.getElementById('cv-file-name');

  const submitBtnLabel = submitBtn.innerHTML;

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileNameEl.textContent = file ? file.name : '';
  });

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', Boolean(isError));
    statusEl.classList.toggle('is-success', !isError && Boolean(message));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('', false);

    const file = fileInput?.files[0];
    if (!file) {
      setStatus('Please upload your resume (PDF).', true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting…';

    try {
      const data = new FormData(form);

      const blob = await upload(`career-cvs/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/career-blob-upload',
      });
      const cvFileUrl = blob.url;

      const payload = {
        fullName: data.get('fullName')?.trim() || '',
        email: data.get('email')?.trim() || '',
        phoneNumber: data.get('phoneNumber')?.trim() || '',
        position: data.get('position')?.trim() || '',
        cvFileUrl,
        linkedin: data.get('linkedin')?.trim() || '',
        coverNote: data.get('coverNote')?.trim() || '',
      };

      const response = await fetch('/api/career-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong. Please try again.');
      }

      form.reset();
      if (fileNameEl) fileNameEl.textContent = '';
      setStatus("Thank you! We've received your application and will be in touch soon.", false);
    } catch (error) {
      setStatus(error.message || 'Something went wrong. Please try again.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtnLabel;
    }
  });
}
