import { handleUpload } from '@vercel/blob/client';

// Issues short-lived client tokens so the browser can upload a candidate's
// CV/portfolio PDF straight to Vercel Blob (bypassing this function's body-size
// limit). See frontend/assets/js/career-contact-form.js for the caller.
export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
    });
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('career-cvs/')) {
          throw new Error('Invalid upload path.');
        }

        return {
          allowedContentTypes: ['application/pdf'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Career CV uploaded:', blob.url);
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
