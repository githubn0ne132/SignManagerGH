const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Default password if not set

// Database Connection
const db = new sqlite3.Database('./signature_app.db');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/fonts', express.static('fonts'));

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'fontFile') {
            cb(null, 'fonts/');
        } else {
            cb(null, 'uploads/');
        }
    },
    filename: (req, file, cb) => {
        // Keep original name for fonts to be recognizable, or use timestamp
        if (file.fieldname === 'fontFile') {
            cb(null, Date.now() + '-' + file.originalname);
        } else {
            cb(null, 'bg-' + Date.now() + path.extname(file.originalname));
        }
    }
});
const upload = multer({ storage: storage });

// --- Middleware for Admin Auth ---
const adminAuth = (req, res, next) => {
    // Simple check: client sends password in headers or body.
    // Ideally this should be a session or JWT, but keeping it simple as per specs.
    const password = req.headers['x-admin-password'];
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- API Routes ---

// Login Check
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// GET Configuration
app.get('/api/config', (req, res) => {
    db.get("SELECT * FROM template_config LIMIT 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// UPDATE Configuration (Bg Image + Dims)
app.post('/api/config', adminAuth, upload.single('bgImage'), (req, res) => {
    const { canvas_width, canvas_height } = req.body;
    let sql, params;

    if (req.file) {
        // Update with new image
        sql = `UPDATE template_config SET bg_image_path = ?, canvas_width = ?, canvas_height = ? WHERE id = (SELECT id FROM template_config LIMIT 1)`;
        params = [req.file.path, canvas_width, canvas_height];
    } else {
        // Update only dims
        sql = `UPDATE template_config SET canvas_width = ?, canvas_height = ? WHERE id = (SELECT id FROM template_config LIMIT 1)`;
        params = [canvas_width, canvas_height];
    }

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes, bg_image_path: req.file ? req.file.path : undefined });
    });
});

// GET All Fields
app.get('/api/fields', (req, res) => {
    db.all("SELECT * FROM signature_fields", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// SAVE Field (Create or Update)
app.post('/api/fields', adminAuth, (req, res) => {
    const { id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing } = req.body;

    if (id) {
        // Update
        const sql = `UPDATE signature_fields SET field_label=?, variable_id=?, x_pos=?, y_pos=?, font_family=?, font_size=?, font_color=?, font_weight=?, letter_spacing=? WHERE id=?`;
        const params = [field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing, id];
        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id });
        });
    } else {
        // Create
        const sql = `INSERT INTO signature_fields (field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing) VALUES (?,?,?,?,?,?,?,?,?)`;
        const params = [field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing];
        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
    }
});

// DELETE Field
app.delete('/api/fields/:id', adminAuth, (req, res) => {
    db.run("DELETE FROM signature_fields WHERE id=?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// GET User Data
app.get('/api/user/:id', (req, res) => {
    db.get("SELECT payload FROM user_data WHERE user_identifier = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json(JSON.parse(row.payload));
        } else {
            res.json(null); // No data found
        }
    });
});

// SAVE User Data
app.post('/api/user/:id', (req, res) => {
    const userIdentifier = req.params.id;
    const payload = JSON.stringify(req.body);

    // Upsert equivalent
    db.serialize(() => {
        db.run(`INSERT OR REPLACE INTO user_data (user_identifier, payload) VALUES (?, ?)`, [userIdentifier, payload], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// GET Custom Fonts
app.get('/api/fonts', (req, res) => {
    db.all("SELECT * FROM custom_fonts", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// UPLOAD Custom Font
app.post('/api/fonts', adminAuth, upload.single('fontFile'), (req, res) => {
    const { font_name } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const sql = `INSERT INTO custom_fonts (font_name, file_path) VALUES (?, ?)`;
    db.run(sql, [font_name, req.file.path], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, font_name, file_path: req.file.path });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
