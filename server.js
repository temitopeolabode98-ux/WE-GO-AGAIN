const http = require("node:http");
const path = require("node:path");
const fsp = require("node:fs/promises");
const crypto = require("node:crypto");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");
const TEMP_SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.tmp.json");
const MAX_BODY_SIZE = 100 * 1024;
const allowedServices = new Set([
  "",
  "New website",
  "Website redesign",
  "Website updates",
  "Technical support",
]);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function validateEnquiry(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      enquiry: {},
      errors: { form: "Please send a valid enquiry." },
    };
  }

  const enquiry = {
    name: typeof input.name === "string" ? input.name.trim() : "",
    email: typeof input.email === "string" ? input.email.trim() : "",
    service: typeof input.service === "string" ? input.service.trim() : "",
    message: typeof input.message === "string" ? input.message.trim() : "",
  };
  const errors = {};

  if (enquiry.name.length < 2 || enquiry.name.length > 100) {
    errors.name = "Please provide your name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.email) || enquiry.email.length > 254) {
    errors.email = "Please provide a valid email address.";
  }
  if (!allowedServices.has(enquiry.service)) {
    errors.service = "Please choose a valid service.";
  }
  if (enquiry.message.length < 10 || enquiry.message.length > 5000) {
    errors.message = "Please provide project details between 10 and 5,000 characters.";
  }

  return { enquiry, errors };
}

async function saveEnquiry(enquiry) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  let submissions = [];

  try {
    submissions = JSON.parse(await fsp.readFile(SUBMISSIONS_FILE, "utf8"));
    if (!Array.isArray(submissions)) submissions = [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  submissions.push({
    id: crypto.randomUUID(),
    ...enquiry,
    createdAt: new Date().toISOString(),
  });
  await fsp.writeFile(TEMP_SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2) + "\n", "utf8");
  await fsp.rename(TEMP_SUBMISSIONS_FILE, SUBMISSIONS_FILE);
}

async function serveStaticFile(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(ROOT_DIR, "." + requestedPath);

  if (!filePath.startsWith(ROOT_DIR + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fsp.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(file);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error.code === "ENOENT" ? "Not found" : "Unable to read file");
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/contact") {
    if (!request.headers["content-type"]?.includes("application/json")) {
      sendJson(response, 415, { error: "Content-Type must be application/json." });
      return;
    }

    try {
      const input = JSON.parse(await readRequestBody(request));
      const { enquiry, errors } = validateEnquiry(input);
      if (Object.keys(errors).length > 0) {
        sendJson(response, 400, { error: "Please correct the highlighted fields.", fields: errors });
        return;
      }

      await saveEnquiry(enquiry);
      sendJson(response, 201, { message: "Thanks. Your enquiry has been received." });
    } catch (error) {
      const statusCode = error instanceof SyntaxError || error.message === "Request body is too large." ? 400 : 500;
      sendJson(response, statusCode, { error: statusCode === 400 ? "Invalid request." : "Unable to save your enquiry." });
    }
    return;
  }

  if (request.method === "GET") {
    await serveStaticFile(request, response, requestUrl.pathname);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed." });
});

if (require.main === module) {
  if (process.versions.node.split(".").map(Number)[0] < 20) {
    console.error("Node.js 20 or newer is required.");
    process.exit(1);
  }

  server.listen(PORT, HOST, () => {
    console.log(`Murthe-help server running at http://${HOST}:${PORT}`);
  });
}

module.exports = { server, validateEnquiry };