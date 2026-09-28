# WE-GO-AGAIN

## Run locally

Requires Node.js 20 or newer. Check with `node --version`.

```text
npm install
npm run check
npm start
```

Open `http://127.0.0.1:3000` after starting the server. Do not open `index.html` directly or use a static-only preview server, because those cannot provide the `/api/contact` endpoint.

Contact enquiries are validated by the server and saved to `data/submissions.json`. The `data` directory is ignored by Git because it contains submitted contact details.

## Deploy to Vercel

Vercel serves the static pages and the `/api` functions in this project. Create a private Blob store in the Vercel project's Storage tab and connect it to the project; Vercel will add the storage credentials to the function environment. Deploy again after connecting the store. Enquiries are saved as private JSON blobs and can be managed from the Blob store.

## Use the form from GitHub Pages

GitHub Pages cannot run the API itself. Deploy the project to Vercel first, then set the `contact-api-url` meta tag in `contact.html` to `https://YOUR-VERCEL-DOMAIN/api/contact`. In Vercel project settings, set `CONTACT_ALLOWED_ORIGINS` to the exact GitHub Pages origin (for example, `https://YOUR-USERNAME.github.io`, with no path), then redeploy. The local server and Vercel-hosted pages use `/api/contact` by default.

The backend endpoints are:

- `GET /api/health` checks that the server is running.
- `POST /api/contact` accepts JSON with `name`, `email`, `service`, and `message`. On Vercel, the same API route is provided by `api/contact.js` and requires a connected private Blob store.