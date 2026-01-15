const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { generateSignature } = require('./services/imageGenerator');
const db = require('./db');

console.log("Starting server.js...");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

console.log("Middleware setup...");
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/fonts', express.static('fonts'));

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

const adminAuth = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

console.log("Defining routes...");

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/templates', async (req, res) => {
    console.log("GET /api/templates");
    try {
        const rows = await db.all("SELECT * FROM templates", []);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/templates/active', async (req, res) => {
    try {
        const row = await db.get("SELECT * FROM templates WHERE is_active = 1 LIMIT 1");
        if (!row) return res.status(404).json({ error: 'No active template found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/templates', adminAuth, async (req, res) => {
    const { name } = req.body;
    try {
        const result = await db.run("INSERT INTO templates (name, bg_image_path, canvas_width, canvas_height, is_active) VALUES (?, NULL, 600, 200, 0)", [name]);
        res.json({ id: result.lastID, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/templates/:id', adminAuth, upload.single('bgImage'), async (req, res) => {
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

    try {
        const result = await db.run(sql, params);
        res.json({ success: true, changes: result.changes, bg_image_path: req.file ? req.file.path : undefined });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/templates/:id/active', adminAuth, async (req, res) => {
    const id = req.params.id;
    try {
        await db.run("UPDATE templates SET is_active = 0");
        await db.run("UPDATE templates SET is_active = 1 WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/templates/:id', adminAuth, async (req, res) => {
    try {
        await db.run("DELETE FROM templates WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/fields', async (req, res) => {
    const templateId = req.query.template_id;
    try {
        if (templateId) {
            const rows = await db.all("SELECT * FROM signature_fields WHERE template_id = ?", [templateId]);
            res.json(rows);
        } else {
            const activeTemplate = await db.get("SELECT id FROM templates WHERE is_active = 1");
            if (activeTemplate) {
                const rows = await db.all("SELECT * FROM signature_fields WHERE template_id = ?", [activeTemplate.id]);
                res.json(rows);
            } else {
                res.json([]);
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/fields', adminAuth, async (req, res) => {
    const { id, template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing } = req.body;

    if (!template_id) return res.status(400).json({ error: 'template_id is required' });

    try {
        if (id) {
            const sql = `UPDATE signature_fields SET field_label=?, variable_id=?, x_pos=?, y_pos=?, font_family=?, font_size=?, font_color=?, font_weight=?, letter_spacing=? WHERE id=?`;
            const params = [field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing, id];
            await db.run(sql, params);
            res.json({ id });
        } else {
            const sql = `INSERT INTO signature_fields (template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing) VALUES (?,?,?,?,?,?,?,?,?,?)`;
            const params = [template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing];
            const result = await db.run(sql, params);
            res.json({ id: result.lastID });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/fields/:id', adminAuth, async (req, res) => {
    try {
        const result = await db.run("DELETE FROM signature_fields WHERE id=?", [req.params.id]);
        res.json({ deleted: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/user/:id', async (req, res) => {
    try {
        const row = await db.get("SELECT payload FROM user_data WHERE user_identifier = ?", [req.params.id]);
        if (row) {
            res.json(JSON.parse(row.payload));
        } else {
            res.json(null);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/user/:id', async (req, res) => {
    const userIdentifier = req.params.id;
    const payload = JSON.stringify(req.body);

    try {
        await db.run(`INSERT OR REPLACE INTO user_data (user_identifier, payload) VALUES (?, ?)`, [userIdentifier, payload]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/signature/:userId/html', (req, res) => {
    const userId = req.params.userId;
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

app.get('/signature/:userId/image.png', async (req, res) => {
    const userId = req.params.userId;

    try {
        const userRow = await db.get("SELECT payload FROM user_data WHERE user_identifier = ?", [userId]);
        const userData = userRow ? JSON.parse(userRow.payload) : {};

        const templateRow = await db.get("SELECT * FROM templates WHERE is_active = 1 LIMIT 1");
        if (!templateRow) return res.status(404).send("No active template");

        const fieldRows = await db.all("SELECT * FROM signature_fields WHERE template_id = ?", [templateRow.id]);
        const fontRows = await db.all("SELECT * FROM custom_fonts", []);

        const buffer = await generateSignature(templateRow, fieldRows, userData, fontRows);

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).send("Generation Error");
    }
});

app.get('/api/fonts', async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM custom_fonts", []);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/fonts', adminAuth, upload.single('fontFile'), async (req, res) => {
    const { font_name } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const sql = `INSERT INTO custom_fonts (font_name, file_path) VALUES (?, ?)`;
        const result = await db.run(sql, [font_name, req.file.path]);
        res.json({ id: result.lastID, font_name, file_path: req.file.path });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

console.log("Attempting to listen on port", PORT);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
