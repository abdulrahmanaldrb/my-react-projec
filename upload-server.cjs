// Simple local upload server to save files into uploads/images/
// Run with: npm run upload-server
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

const app = express();
const PORT = process.env.UPLOAD_PORT || 4001;
const ROOT = process.cwd();
const DEFAULT_DIR = path.join(ROOT, 'uploads', 'images');

mkdirp.sync(DEFAULT_DIR);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Optional query param: ?dir=images/web
    let dir = (req.query && req.query.dir) ? String(req.query.dir) : 'images';
    // Sanitize and normalize
    dir = dir.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\//, '');
    const targetDir = path.join(ROOT, 'uploads', dir);
    mkdirp.sync(targetDir);
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const final = `${Date.now()}_${safe}`;
    cb(null, final);
  }
});

const upload = multer({ storage });

app.use(cors());

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  let dir = (req.query && req.query.dir) ? String(req.query.dir) : 'images';
  dir = dir.replace(/\\/g, '/').replace(/\.\./g, '').replace(/^\//, '');
  const relativePath = path.posix.join('uploads', dir, req.file.filename);
  res.json({ ok: true, path: relativePath });
});

app.use('/uploads', express.static(path.join(ROOT, 'uploads')));

app.listen(PORT, () => console.log(`[upload-server] listening on http://localhost:${PORT}`));
