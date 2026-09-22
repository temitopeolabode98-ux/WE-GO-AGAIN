# WE-GO-AGAIN

## Run locally

Requires Node.js 18 or newer. Check with `node --version`.

```text
npm install
npm run check
npm start
```

Open `http://127.0.0.1:3000` after starting the server. Do not open `index.html` directly or use a static-only preview server, because those cannot provide the `/api/contact` endpoint.

Contact enquiries are validated by the server and saved to `data/submissions.json`. The `data` directory is ignored by Git because it contains submitted contact details.

The backend endpoints are:

- `GET /api/health` checks that the server is running.
- `POST /api/contact` accepts JSON with `name`, `email`, `service`, and `message`.