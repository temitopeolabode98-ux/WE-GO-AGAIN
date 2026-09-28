const crypto = require("node:crypto");
const { put } = require("@vercel/blob");
const { validateEnquiry } = require("../server");

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (!origin) return true;

  const protocol = request.headers["x-forwarded-proto"] || "https";
  const requestOrigin = `${protocol}://${request.headers.host}`;
  const allowedOrigins = (process.env.CONTACT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((allowedOrigin) => allowedOrigin.trim())
    .filter(Boolean);

  if (origin !== requestOrigin && !allowedOrigins.includes(origin)) return false;

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Vary", "Origin");
  return true;
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function contact(request, response) {
  if (!setCorsHeaders(request, response)) {
    sendJson(response, 403, { error: "This site is not allowed to submit enquiries." });
    return;
  }

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  if (!request.headers["content-type"]?.includes("application/json")) {
    sendJson(response, 415, { error: "Content-Type must be application/json." });
    return;
  }

  try {
    const input = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    const { enquiry, errors } = validateEnquiry(input);
    if (Object.keys(errors).length > 0) {
      sendJson(response, 400, { error: "Please correct the highlighted fields.", fields: errors });
      return;
    }

    const record = {
      id: crypto.randomUUID(),
      ...enquiry,
      createdAt: new Date().toISOString(),
    };
    const date = record.createdAt.slice(0, 10);
    await put(`enquiries/${date}/${record.id}.json`, JSON.stringify(record), {
      access: "private",
      contentType: "application/json",
    });
    sendJson(response, 201, { message: "Thanks. Your enquiry has been received." });
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid request." });
      return;
    }

    console.error("Unable to save contact enquiry:", error);
    sendJson(response, 503, { error: "Unable to save your enquiry. Check the Vercel Blob connection." });
  }
}

module.exports = contact;
module.exports.config = {
  api: { bodyParser: { sizeLimit: "100kb" } },
};