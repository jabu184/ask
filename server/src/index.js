require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize database
const db = require('./config/db');

const authRoutes = require('./routes/auth');
const surveyRoutes = require('./routes/surveys');
const publicRoutes = require('./routes/public');
const exportRoutes = require('./routes/export');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust first proxy (e.g. reverse proxy or docker bridge)
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Enable CORS for local Vite dev server or customized origin
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/surveys', exportRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// Robots.txt for Search Engines
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(
`User-agent: *
Allow: /
Allow: /features
Allow: /s/
Allow: /login
Allow: /register
Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /account
Disallow: /account/
Disallow: /api/

Sitemap: https://ask.urspace.com/sitemap.xml
`
  );
});

// Dynamic XML Sitemap
app.get('/sitemap.xml', (req, res) => {
  try {
    const activeSurveys = db.prepare('SELECT id, created_at FROM surveys WHERE is_active = 1 ORDER BY created_at DESC').all();
    
    const baseUrl = 'https://ask.urspace.com';
    const now = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/features</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

    for (const survey of activeSurveys) {
      const lastMod = (survey.created_at || now).split(' ')[0].split('T')[0];
      xml += `
  <url>
    <loc>${baseUrl}/s/${survey.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    xml += `
</urlset>`;

    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[Sitemap Error]', err);
    res.status(500).send('Error generating sitemap');
  }
});

// Static frontend serving in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Static] Serving frontend client from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // Special handler for survey URLs to inject dynamic Open Graph meta tags for social crawlers
  app.get('/s/:surveyId', (req, res, next) => {
    const { surveyId } = req.params;
    const indexPath = path.join(clientDistPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      return next();
    }

    try {
      const survey = db.prepare('SELECT title, description, is_active FROM surveys WHERE id = ?').get(surveyId);
      if (!survey || survey.is_active === 0) {
        return res.sendFile(indexPath);
      }

      let html = fs.readFileSync(indexPath, 'utf8');
      const pageTitle = `${survey.title} — Ask by urspace.com`;
      const pageDesc = survey.description
        ? survey.description.replace(/["\n\r]/g, ' ').trim().slice(0, 160)
        : 'Take this quick, anonymous survey on Ask by urspace.com. Free, private, and instant.';
      const pageUrl = `https://ask.urspace.com/s/${surveyId}`;

      // Inject dynamically into HTML
      html = html.replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`);
      html = html.replace(/<meta name="title" content=".*?"\s*\/?>/, `<meta name="title" content="${pageTitle}" />`);
      html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${pageDesc}" />`);
      html = html.replace(/<link rel="canonical" href=".*?"\s*\/?>/, `<link rel="canonical" href="${pageUrl}" />`);
      html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${pageTitle}" />`);
      html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${pageDesc}" />`);
      html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${pageUrl}" />`);
      html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${pageTitle}" />`);
      html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${pageDesc}" />`);

      res.type('text/html');
      return res.send(html);
    } catch (err) {
      console.error('[Survey Meta Injection Error]', err);
      return res.sendFile(indexPath);
    }
  });

  // Handle SPA routing: redirect unknown non-API paths to index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.log('[Static] client/dist not detected. Running in API-only mode.');
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SurveyLite backend listening on http://0.0.0.0:${PORT}`);
});
