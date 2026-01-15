const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./signature_app.db');

db.serialize(() => {
    // 1. Templates Table (Replaces template_config)
    db.run(`CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        bg_image_path TEXT,
        canvas_width INTEGER DEFAULT 600,
        canvas_height INTEGER DEFAULT 200,
        is_active INTEGER DEFAULT 0
    )`);

    // Ensure at least one default template exists
    db.get("SELECT count(*) as count FROM templates", (err, row) => {
        if (!err && row && row.count === 0) {
            db.run("INSERT INTO templates (name, bg_image_path, canvas_width, canvas_height, is_active) VALUES ('Default', NULL, 600, 200, 1)");
        }
    });

    // 2. Signature Fields Table (Added template_id)
    db.run(`CREATE TABLE IF NOT EXISTS signature_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        field_label TEXT,
        variable_id TEXT,
        x_pos INTEGER,
        y_pos INTEGER,
        font_family TEXT,
        font_size INTEGER,
        font_color TEXT,
        font_weight TEXT,
        letter_spacing REAL,
        FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE
    )`);

    // 3. User Data Table (Unchanged)
    db.run(`CREATE TABLE IF NOT EXISTS user_data (
        user_identifier TEXT PRIMARY KEY,
        payload TEXT
    )`);

    // 4. Custom Fonts Table (Unchanged)
    db.run(`CREATE TABLE IF NOT EXISTS custom_fonts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        font_name TEXT,
        file_path TEXT
    )`, (err) => {
        if (!err) {
            console.log("Database initialized.");
        }
    });
});
