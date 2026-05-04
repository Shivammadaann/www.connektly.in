require("dotenv").config();
const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "data", "blogs.json");
const HELP_DATA_FILE = path.join(__dirname, "data", "help.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const LEAD_FORM_DATA_FILE = process.env.LEAD_FORM_DATA_FILE
  ? path.resolve(__dirname, process.env.LEAD_FORM_DATA_FILE)
  : path.join(__dirname, "data", "lead-form-submissions.json");
const WEBSITE_PUBLIC_BASE_URL = (process.env.WEBSITE_PUBLIC_BASE_URL || "https://connektly.in").replace(/\/$/, "");
const WEBSITE_CONTENT_SYNC_TOKEN = process.env.WEBSITE_CONTENT_SYNC_TOKEN || "";
const CENTRAL_ADMIN_URL = (process.env.CENTRAL_ADMIN_URL || "https://www.admin.connektly.in").replace(/\/$/, "");
const ADMIN_PUBLIC_API_BASE_URL = (process.env.ADMIN_PUBLIC_API_BASE_URL || `${CENTRAL_ADMIN_URL}/api/public`).replace(/\/$/, "");

// Middleware
app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

// Setup explicit static directories to allow easy file fetching
app.use((req, res, next) => {
  const normalizedPath = req.path.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/admin" || normalizedPath.startsWith("/admin/")) {
    res.redirect(302, CENTRAL_ADMIN_URL);
    return;
  }
  next();
});

app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

// Utility function to read and write JSON data safely
function getBlogs() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading blogs.json", err);
    return [];
  }
}

function getHelp() {
  try {
    const data = fs.readFileSync(HELP_DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading help.json", err);
    return [];
  }
}

function getLeadFormSubmissions() {
  try {
    const data = fs.readFileSync(LEAD_FORM_DATA_FILE, "utf8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return [];
    }
    console.error("Error reading lead-form-submissions.json", err);
    return [];
  }
}

function saveLeadFormSubmissions(submissions) {
  fs.mkdirSync(path.dirname(LEAD_FORM_DATA_FILE), { recursive: true });
  const tempPath = `${LEAD_FORM_DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(submissions, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, LEAD_FORM_DATA_FILE);
}

function normalizeSubmissionType(value, sourcePath) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["booked_demo", "demo", "demo_booking", "book_demo"].includes(normalized)) {
    return "booked_demo";
  }
  if (String(sourcePath || "").toLowerCase().includes("book-demo")) {
    return "booked_demo";
  }
  return "lead_inquiry";
}

function sanitizeLeadValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeLeadValue).filter((entry) => entry !== "");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().slice(0, 5000);
}

function sanitizeLeadText(value) {
  if (Array.isArray(value)) {
    return sanitizeLeadText(value[0]);
  }
  return sanitizeLeadValue(value);
}

function normalizeLeadFields(fields) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return {};
  }

  return Object.entries(fields).reduce((normalized, [key, value]) => {
    const fieldName = String(key || "").trim().slice(0, 80);
    if (!fieldName) {
      return normalized;
    }
    normalized[fieldName] = sanitizeLeadValue(value);
    return normalized;
  }, {});
}

function firstLeadField(fields, names) {
  for (const name of names) {
    const value = fields[name];
    if (Array.isArray(value)) {
      const first = value.find(Boolean);
      if (first) return String(first);
    } else if (value) {
      return String(value);
    }
  }
  return "";
}

function normalizeWebsiteDate(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
}

function normalizeString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizeBlog(row) {
  return {
    id: normalizeString(row && row.id) || Date.now().toString(),
    title: normalizeString(row && row.title) || "Untitled",
    author: normalizeString(row && row.author) || "Anonymous",
    excerpt: normalizeString(row && row.excerpt),
    content: typeof (row && row.content) === "string" ? row.content : "",
    coverImage: normalizeString(row && row.coverImage),
    date: normalizeWebsiteDate(row && row.date),
    updatedAt: normalizeString(row && row.updatedAt) || null
  };
}

function normalizeHelpArticle(row) {
  return {
    id: normalizeString(row && row.id) || `help-${Date.now()}`,
    title: normalizeString(row && row.title) || "Untitled",
    author: normalizeString(row && row.author) || "Support Team",
    category: normalizeString(row && row.category) || "Connektly Overview",
    excerpt: normalizeString(row && row.excerpt),
    content: typeof (row && row.content) === "string" ? row.content : "",
    date: normalizeWebsiteDate(row && row.date),
    updatedAt: normalizeString(row && row.updatedAt) || null
  };
}

function sortContentRows(rows) {
  return [...rows].sort((left, right) => {
    const rightDate = Date.parse(String(right.updatedAt || right.date || 0));
    const leftDate = Date.parse(String(left.updatedAt || left.date || 0));
    return rightDate - leftDate;
  });
}

function writeJsonArray(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function buildWebsiteContentResponse() {
  const blogs = sortContentRows(getBlogs().map(normalizeBlog));
  const helpArticles = sortContentRows(getHelp().map(normalizeHelpArticle));
  const defaultCategories = ["Connektly Overview", "Get Started", "Connect Your Number", "Privacy & Security"];
  const categories = [...new Set([...defaultCategories, ...helpArticles.map((article) => article.category).filter(Boolean)])];

  return {
    generatedAt: new Date().toISOString(),
    publicBaseUrl: WEBSITE_PUBLIC_BASE_URL,
    summary: {
      blogs: blogs.length,
      helpArticles: helpArticles.length,
      helpCategories: categories.length,
      mediaRootConfigured: true
    },
    categories,
    blogs,
    helpArticles,
    warnings: []
  };
}

function normalizeBlogPayload(body, existing) {
  const timestamp = new Date().toISOString();
  const title = normalizeString((body && body.title) || (existing && existing.title));
  if (!title) {
    throw new Error("Blog post title is required.");
  }

  return {
    id: existing ? existing.id : Date.now().toString(),
    title,
    author: normalizeString((body && body.author) || (existing && existing.author)) || "Anonymous",
    excerpt: normalizeString((body && body.excerpt) || (existing && existing.excerpt)),
    content: typeof (body && body.content) === "string" ? body.content : (existing && existing.content) || "",
    coverImage: normalizeString((body && body.coverImage) || (existing && existing.coverImage)),
    date: existing ? existing.date : timestamp,
    updatedAt: timestamp
  };
}

function normalizeHelpPayload(body, existing) {
  const timestamp = new Date().toISOString();
  const title = normalizeString((body && body.title) || (existing && existing.title));
  if (!title) {
    throw new Error("Help article title is required.");
  }

  return {
    id: existing ? existing.id : `help-${Date.now()}`,
    title,
    author: normalizeString((body && body.author) || (existing && existing.author)) || "Support Team",
    category: normalizeString((body && body.category) || (existing && existing.category)) || "Connektly Overview",
    excerpt: normalizeString((body && body.excerpt) || (existing && existing.excerpt)),
    content: typeof (body && body.content) === "string" ? body.content : (existing && existing.content) || "",
    date: existing ? existing.date : timestamp,
    updatedAt: timestamp
  };
}

function saveBlog(body, id) {
  const blogs = getBlogs().map(normalizeBlog);
  const index = id ? blogs.findIndex((blog) => blog.id === id) : -1;
  if (id && index === -1) {
    throw new Error("Blog post was not found.");
  }

  const nextBlog = normalizeBlogPayload(body, index >= 0 ? blogs[index] : null);
  const nextBlogs = index >= 0 ? blogs.map((blog, blogIndex) => (blogIndex === index ? nextBlog : blog)) : [nextBlog, ...blogs];
  writeJsonArray(DATA_FILE, sortContentRows(nextBlogs));
  return buildWebsiteContentResponse();
}

function deleteBlog(id) {
  const blogs = getBlogs().map(normalizeBlog);
  const nextBlogs = blogs.filter((blog) => blog.id !== id);
  if (nextBlogs.length === blogs.length) {
    throw new Error("Blog post was not found.");
  }
  writeJsonArray(DATA_FILE, nextBlogs);
  return buildWebsiteContentResponse();
}

function saveHelpArticle(body, id) {
  const articles = getHelp().map(normalizeHelpArticle);
  const index = id ? articles.findIndex((article) => article.id === id) : -1;
  if (id && index === -1) {
    throw new Error("Help article was not found.");
  }

  const nextArticle = normalizeHelpPayload(body, index >= 0 ? articles[index] : null);
  const nextArticles = index >= 0
    ? articles.map((article, articleIndex) => (articleIndex === index ? nextArticle : article))
    : [nextArticle, ...articles];
  writeJsonArray(HELP_DATA_FILE, sortContentRows(nextArticles));
  return buildWebsiteContentResponse();
}

function deleteHelpArticle(id) {
  const articles = getHelp().map(normalizeHelpArticle);
  const nextArticles = articles.filter((article) => article.id !== id);
  if (nextArticles.length === articles.length) {
    throw new Error("Help article was not found.");
  }
  writeJsonArray(HELP_DATA_FILE, nextArticles);
  return buildWebsiteContentResponse();
}

function extensionForMime(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return null;
}

function sanitizeUploadBaseName(fileName) {
  const base = path.parse(normalizeString(fileName) || "website-media").name || "website-media";
  return base.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "website-media";
}

function saveWebsiteMedia(body) {
  const dataUrl = normalizeString(body && body.dataUrl);
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error("Only base64 PNG, JPEG, WEBP, or GIF images can be uploaded.");
  }

  const mimeType = match[1].toLowerCase();
  const extension = extensionForMime(mimeType);
  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const fileName = `${Date.now()}-${crypto.randomInt(100000000, 999999999)}-${sanitizeUploadBaseName(body && body.fileName)}.${extension}`;
  const uploadPath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(uploadPath, buffer);
  const location = `/uploads/${fileName}`;

  return {
    location,
    publicUrl: `${WEBSITE_PUBLIC_BASE_URL}${location}`,
    contentType: mimeType,
    size: buffer.byteLength
  };
}

function normalizeLeadSubmission(row) {
  const submission = row && typeof row === "object" ? row : {};
  return {
    id: normalizeString(submission.id) || `lead-${Date.now()}`,
    type: submission.type === "booked_demo" ? "booked_demo" : "lead_inquiry",
    submittedAt: normalizeWebsiteDate(submission.submittedAt),
    sourcePath: normalizeString(submission.sourcePath) || "/",
    sourceUrl: normalizeString(submission.sourceUrl),
    pageTitle: normalizeString(submission.pageTitle),
    formId: normalizeString(submission.formId),
    userAgent: normalizeString(submission.userAgent),
    name: normalizeString(submission.name),
    email: normalizeString(submission.email),
    phone: normalizeString(submission.phone),
    company: normalizeString(submission.company),
    topic: normalizeString(submission.topic),
    message: normalizeString(submission.message),
    fields: submission.fields && typeof submission.fields === "object" && !Array.isArray(submission.fields) ? submission.fields : {}
  };
}

function buildLeadFormsResponse() {
  const submissions = getLeadFormSubmissions()
    .map(normalizeLeadSubmission)
    .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt));
  const bookedDemos = submissions.filter((submission) => submission.type === "booked_demo");
  const leadInquiries = submissions.filter((submission) => submission.type === "lead_inquiry");

  return {
    generatedAt: new Date().toISOString(),
    publicBaseUrl: WEBSITE_PUBLIC_BASE_URL,
    summary: {
      total: submissions.length,
      bookedDemos: bookedDemos.length,
      leadInquiries: leadInquiries.length,
      lastSubmissionAt: submissions[0] ? submissions[0].submittedAt : null
    },
    bookedDemos,
    leadInquiries,
    submissions,
    warnings: []
  };
}

function requireAdminSync(req, res, next) {
  if (!WEBSITE_CONTENT_SYNC_TOKEN) {
    res.status(503).json({ error: "Website content sync token is not configured." });
    return;
  }

  const bearerToken = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const headerToken = String(req.get("x-connektly-admin-token") || "").trim();
  if (bearerToken !== WEBSITE_CONTENT_SYNC_TOKEN && headerToken !== WEBSITE_CONTENT_SYNC_TOKEN) {
    res.status(401).json({ error: "Unauthorized website content sync request." });
    return;
  }

  next();
}

function sendAdminError(res, err) {
  res.status(500).json({ error: err instanceof Error ? err.message : "Website admin operation failed." });
}

function legacyAdminDisabled(req, res) {
  res.status(410).json({
    error: "Website content writes have moved to the centralized Connektly Admin Control Centre."
  });
}

app.get("/api/admin/content", requireAdminSync, (req, res) => {
  try {
    res.json(buildWebsiteContentResponse());
  } catch (err) {
    sendAdminError(res, err);
  }
});

app.post("/api/admin/content/media", requireAdminSync, (req, res) => {
  try {
    res.status(201).json(saveWebsiteMedia(req.body));
  } catch (err) {
    sendAdminError(res, err);
  }
});

app.post("/api/admin/content/blogs", requireAdminSync, (req, res) => {
  try {
    res.status(201).json(saveBlog(req.body));
  } catch (err) {
    sendAdminError(res, err);
  }
});

app.patch("/api/admin/content/blogs/:id", requireAdminSync, (req, res) => {
  try {
    res.json(saveBlog(req.body, req.params.id));
  } catch (err) {
    sendAdminError(res, err);
  }
});

app.delete("/api/admin/content/blogs/:id", requireAdminSync, (req, res) => {
  try {
    res.json(deleteBlog(req.params.id));
  } catch (err) {
    sendAdminError(res, err);
  }
});

app.post("/api/admin/content/help", requireAdminSync, (req, res) => {
  try {
    res.status(201).json(saveHelpArticle(req.body));
  } catch (err) {
    sendAdminError(res, err);
  }
});

app.patch("/api/admin/content/help/:id", requireAdminSync, (req, res) => {
  try {
    res.json(saveHelpArticle(req.body, req.params.id));
  } catch (err) {
    sendAdminError(res, err);
  }
});

app.delete("/api/admin/content/help/:id", requireAdminSync, (req, res) => {
  try {
    res.json(deleteHelpArticle(req.params.id));
  } catch (err) {
    sendAdminError(res, err);
  }
});

app.get("/api/admin/lead-form-submissions", requireAdminSync, (req, res) => {
  try {
    res.json(buildLeadFormsResponse());
  } catch (err) {
    sendAdminError(res, err);
  }
});

// REST API for Blogs

// GET all blogs
app.get("/api/blogs", (req, res) => {
  const blogs = getBlogs();
  res.json(blogs);
});

// GET a specific blog
app.get("/api/blogs/:id", (req, res) => {
  const blogs = getBlogs();
  const blog = blogs.find(b => b.id === req.params.id);
  if (blog) {
    res.json(blog);
  } else {
    res.status(404).json({ error: "Blog not found" });
  }
});

// Legacy website admin write APIs are disabled. Public reads remain available above.
app.post("/api/upload", legacyAdminDisabled);
app.post("/api/blogs", legacyAdminDisabled);
app.put("/api/blogs/:id", legacyAdminDisabled);
app.delete("/api/blogs/:id", legacyAdminDisabled);


// REST API for Help Articles

app.get("/api/help", (req, res) => {
  res.json(getHelp());
});

app.get("/api/help/:id", (req, res) => {
  const articles = getHelp();
  const article = articles.find(a => a.id === req.params.id);
  if (article) res.json(article);
  else res.status(404).json({ error: "Article not found" });
});

app.post("/api/help", legacyAdminDisabled);
app.put("/api/help/:id", legacyAdminDisabled);
app.delete("/api/help/:id", legacyAdminDisabled);

app.post("/api/form-submissions", (req, res) => {
  try {
    const fields = normalizeLeadFields(req.body && req.body.fields);
    const sourcePath = sanitizeLeadText(req.body && req.body.sourcePath) || "/";
    const type = normalizeSubmissionType(req.body && (req.body.type || req.body.formType), sourcePath);
    const now = new Date().toISOString();
    const firstName = firstLeadField(fields, ["name", "firstName", "first_name"]);
    const lastName = firstLeadField(fields, ["lastName", "last_name"]);
    const submission = {
      id: `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      type,
      submittedAt: now,
      sourcePath,
      sourceUrl: sanitizeLeadText(req.body && req.body.sourceUrl),
      pageTitle: sanitizeLeadText(req.body && req.body.pageTitle),
      formId: sanitizeLeadText(req.body && req.body.formId),
      userAgent: sanitizeLeadText(req.get("user-agent")),
      name: [firstName, lastName].filter(Boolean).join(" ") || firstName || firstLeadField(fields, ["fullName", "full_name"]),
      email: firstLeadField(fields, ["email", "workEmail", "workingEmail"]),
      phone: firstLeadField(fields, ["phone", "whatsapp", "whatsappNumber"]),
      company: firstLeadField(fields, ["company", "organization", "business"]),
      topic: firstLeadField(fields, ["topic", "team"]),
      message: firstLeadField(fields, ["message", "notes", "description"]),
      fields
    };

    const submissions = getLeadFormSubmissions();
    submissions.unshift(submission);
    saveLeadFormSubmissions(submissions.slice(0, 5000));

    res.status(201).json({
      ok: true,
      id: submission.id,
      type: submission.type,
      redirectTo: submission.type === "booked_demo" ? "/demo-book-thank-you/" : "/thank-you/"
    });
  } catch (err) {
    console.error("Error saving website form submission:", err);
    res.status(500).json({ error: "Unable to save form submission." });
  }
});

app.get("/api/pricing-plans", async (req, res) => {
  try {
    const response = await fetch(`${ADMIN_PUBLIC_API_BASE_URL}/pricing-plans`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || `Admin pricing API failed with ${response.status}`);
    }

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(payload);
  } catch (err) {
    console.error("Error fetching centralized pricing plans:", err.message);
    res.status(502).json({ error: "Centralized pricing plans are unavailable." });
  }
});

// Fallback to serve index.html for unknown unhandled routes (for SPA-like behavior, if needed)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// Utility: Hash user data for Meta CAPI
function hashData(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// POST endpoint for Meta Conversions API (Purchase Event)
app.post("/api/track/purchase", async (req, res) => {
  const { email, phone, currency, value } = req.body;
  const PIXEL_ID = process.env.META_PIXEL_ID || "2008094803443395";
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    console.error("Missing META_ACCESS_TOKEN in env variables.");
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: {
          em: [hashData(email)],
          ph: [hashData(phone)]
        },
        custom_data: {
          currency: currency || "USD",
          value: value ? value.toString() : "0.00"
        }
      }
    ]
  };

  try {
    const response = await axios.post(`https://graph.facebook.com/v20.0/${PIXEL_ID}/events`, payload, {
      params: { access_token: ACCESS_TOKEN }
    });
    res.json({ success: true, message: "Purchase event sent to Meta CAPI", fbTrace: response.data });
  } catch (err) {
    console.error("Error sending CAPI event:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: "Failed to transmit event to Meta" });
  }
});

app.listen(PORT, () => {
  console.log(`Connektly local server running on http://localhost:${PORT}`);
});
