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
const CENTRAL_ADMIN_URL = (process.env.CENTRAL_ADMIN_URL || "https://www.admin.connektly.in").replace(/\/$/, "");
const ADMIN_PUBLIC_API_BASE_URL = (process.env.ADMIN_PUBLIC_API_BASE_URL || `${CENTRAL_ADMIN_URL}/api/public`).replace(/\/$/, "");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup explicit static directories to allow easy file fetching
app.use((req, res, next) => {
  const normalizedPath = req.path.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/admin" || normalizedPath.startsWith("/admin/")) {
    res.redirect(302, CENTRAL_ADMIN_URL);
    return;
  }
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
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

function legacyAdminDisabled(req, res) {
  res.status(410).json({
    error: "Website content writes have moved to the centralized Connektly Admin Control Centre."
  });
}

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
