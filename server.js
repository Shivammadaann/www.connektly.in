require("dotenv").config();
const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "blogs.json");
const HELP_DATA_FILE = path.join(__dirname, "data", "help.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup explicit static directories to allow easy file fetching
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(__dirname));

// Ensure upload config exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Set up Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

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

function saveBlogs(blogs) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(blogs, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing blogs.json", err);
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

function saveHelp(articles) {
  try {
    fs.writeFileSync(HELP_DATA_FILE, JSON.stringify(articles, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing help.json", err);
  }
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

// POST to Upload Image directly
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  // TinyMCE natively expects a JSON response structured like { location: 'url' }
  const url = `/uploads/${req.file.filename}`;
  res.json({ location: url });
});

// POST a new blog
app.post("/api/blogs", (req, res) => {
  const blogs = getBlogs();
  const newBlog = {
    id: Date.now().toString(),
    title: req.body.title || "Untitled",
    author: req.body.author || "Anonymous",
    excerpt: req.body.excerpt || "",
    content: req.body.content || "",
    coverImage: req.body.coverImage || "",
    date: new Date().toISOString()
  };
  
  blogs.push(newBlog);
  saveBlogs(blogs);
  
  res.status(201).json(newBlog);
});

// PUT (update) an existing blog
app.put("/api/blogs/:id", (req, res) => {
  const blogs = getBlogs();
  const index = blogs.findIndex(b => b.id === req.params.id);
  
  if (index !== -1) {
    blogs[index] = {
      ...blogs[index],
      title: req.body.title || blogs[index].title,
      author: req.body.author || blogs[index].author,
      excerpt: req.body.excerpt || blogs[index].excerpt,
      content: req.body.content || blogs[index].content,
      coverImage: req.body.coverImage !== undefined ? req.body.coverImage : blogs[index].coverImage,
      // Date can be preserved or updated depending on preference. Preserving it here.
    };
    saveBlogs(blogs);
    res.json(blogs[index]);
  } else {
    res.status(404).json({ error: "Blog not found" });
  }
});

// DELETE a blog
app.delete("/api/blogs/:id", (req, res) => {
  let blogs = getBlogs();
  const initialLength = blogs.length;
  blogs = blogs.filter(b => b.id !== req.params.id);
  
  if (blogs.length < initialLength) {
    saveBlogs(blogs);
    res.json({ success: true, message: "Blog deleted successfully" });
  } else {
    res.status(404).json({ error: "Blog not found" });
  }
});


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

app.post("/api/help", (req, res) => {
  const articles = getHelp();
  const newArticle = {
    id: 'help-' + Date.now().toString(),
    title: req.body.title || "Untitled",
    author: req.body.author || "Support Team",
    category: req.body.category || "General",
    excerpt: req.body.excerpt || "",
    content: req.body.content || "",
    date: new Date().toISOString()
  };
  articles.push(newArticle);
  saveHelp(articles);
  res.status(201).json(newArticle);
});

app.put("/api/help/:id", (req, res) => {
  const articles = getHelp();
  const index = articles.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    articles[index] = {
      ...articles[index],
      title: req.body.title || articles[index].title,
      author: req.body.author || articles[index].author,
      category: req.body.category || articles[index].category,
      excerpt: req.body.excerpt || articles[index].excerpt,
      content: req.body.content || articles[index].content
    };
    saveHelp(articles);
    res.json(articles[index]);
  } else {
    res.status(404).json({ error: "Article not found" });
  }
});

app.delete("/api/help/:id", (req, res) => {
  let articles = getHelp();
  const initialLength = articles.length;
  articles = articles.filter(a => a.id !== req.params.id);
  
  if (articles.length < initialLength) {
    saveHelp(articles);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Article not found" });
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
