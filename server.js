const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { generateSignature } = require('./services/imageGenerator');

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

// --- TEMPLATES ---

// GET All Templates
app.get('/api/templates', (req, res) => {
    db.all("SELECT * FROM templates", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET Active Template
app.get('/api/templates/active', (req, res) => {
    db.get("SELECT * FROM templates WHERE is_active = 1 LIMIT 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'No active template found' });
        res.json(row);
    });
});

// CREATE Template
app.post('/api/templates', adminAuth, (req, res) => {
    const { name } = req.body;
    db.run("INSERT INTO templates (name, bg_image_path, canvas_width, canvas_height, is_active) VALUES (?, NULL, 600, 200, 0)", [name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

// UPDATE Template (Config: Bg Image + Dims + Name)
app.put('/api/templates/:id', adminAuth, upload.single('bgImage'), (req, res) => {
    const { canvas_width, canvas_height, name } = req.body;
    const id = req.params.id;
    let sql, params;

    if (req.file) {
        sql = `UPDATE templates SET bg_image_path = ?, canvas_width = ?, canvas_height = ?, name = ? WHERE id = ?`;
        params = [req.file.path, canvas_width, canvas_height, name, id];
    } else {
        sql = `UPDATE templates SET canvas_width = ?, canvas_height = ?, name = ? WHERE id = ?`;
        params = [canvas_width, canvas_height, name, id];
    }

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes, bg_image_path: req.file ? req.file.path : undefined });
    });
});

// SET Active Template
app.put('/api/templates/:id/active', adminAuth, (req, res) => {
    const id = req.params.id;
    db.serialize(() => {
        db.run("UPDATE templates SET is_active = 0");
        db.run("UPDATE templates SET is_active = 1 WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// DELETE Template
app.delete('/api/templates/:id', adminAuth, (req, res) => {
    db.run("DELETE FROM templates WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- FIELDS ---

// GET Fields for a Template (defaults to active if no query param)
app.get('/api/fields', (req, res) => {
    const templateId = req.query.template_id;
    let sql = "SELECT * FROM signature_fields";
    let params = [];

    if (templateId) {
        sql += " WHERE template_id = ?";
        params.push(templateId);

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        // If no template_id provided, maybe get for active template?
        // Or just return empty? Let's return for active template to be safe/useful.
        db.get("SELECT id FROM templates WHERE is_active = 1", (err, row) => {
            if (!err && row) {
                db.all("SELECT * FROM signature_fields WHERE template_id = ?", [row.id], (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(rows);
                });
            } else {
                res.json([]);
            }
        });
    }
});

// SAVE Field (Create or Update)
app.post('/api/fields', adminAuth, (req, res) => {
    const { id, template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing } = req.body;

    if (!template_id) return res.status(400).json({ error: 'template_id is required' });

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
        const sql = `INSERT INTO signature_fields (template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing) VALUES (?,?,?,?,?,?,?,?,?,?)`;
        const params = [template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing];
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

// --- USER DATA ---

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

    db.serialize(() => {
        db.run(`INSERT OR REPLACE INTO user_data (user_identifier, payload) VALUES (?, ?)`, [userIdentifier, payload], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// --- PUBLIC SIGNATURE GENERATION ---

// GET HTML Snippet
app.get('/signature/:userId/html', (req, res) => {
    const userId = req.params.userId;
    // We can point to the image endpoint.
    // Assuming the server is reachable via a variable or just relative path if used internally,
    // but for Outlook it needs a full URL. We'll use req.protocol and req.get('host').
    const host = req.get('host');
    const protocol = req.protocol;
    const fullUrl = `${protocol}://${host}/signature/${userId}/image.png`;

    const html = `
    <!DOCTYPE html>
    <html>
    <body>
        <a href="#">
            <img src="${fullUrl}" alt="Signature" crossorigin="anonymous">
        </a>
    </body>
    </html>
    `;
    res.send(html);
});

// GET Signature Image
app.get('/signature/:userId/image.png', (req, res) => {
    const userId = req.params.userId;

    // 1. Get User Data
    db.get("SELECT payload FROM user_data WHERE user_identifier = ?", [userId], (err, userRow) => {
        if (err) return res.status(500).send("Database Error");
        const userData = userRow ? JSON.parse(userRow.payload) : {};

        // 2. Get Active Template
        db.get("SELECT * FROM templates WHERE is_active = 1 LIMIT 1", (err, templateRow) => {
            if (err) return res.status(500).send("Database Error");
            if (!templateRow) return res.status(404).send("No active template");

            // 3. Get Fields for this template
            db.all("SELECT * FROM signature_fields WHERE template_id = ?", [templateRow.id], (err, fieldRows) => {
                if (err) return res.status(500).send("Database Error");

                // 4. Get Custom Fonts (for registration)
                db.all("SELECT * FROM custom_fonts", [], async (err, fontRows) => {
                    // 5. Generate Image
                    try {
                        const buffer = await generateSignature(templateRow, fieldRows, userData, fontRows);
                        res.set('Content-Type', 'image/png');
                        res.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // Important for Outlook to refresh
                        res.send(buffer);
                    } catch (e) {
                        console.error(e);
                        res.status(500).send("Generation Error");
                    }
                });
            });
        });
    });
});

// --- FONTS ---

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
