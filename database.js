const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./signature_app.db');

db.serialize(() => {
    // Table: template_config
    db.run(`CREATE TABLE IF NOT EXISTS template_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bg_image_path TEXT,
        canvas_width INTEGER DEFAULT 600,
        canvas_height INTEGER DEFAULT 200
    )`);

    // Ensure we have at least one config row
    db.get("SELECT count(*) as count FROM template_config", (err, row) => {
        if (!err && row && row.count === 0) {
            db.run("INSERT INTO template_config (bg_image_path, canvas_width, canvas_height) VALUES (NULL, 600, 200)");
        }
    });

    // Table: signature_fields
    db.run(`CREATE TABLE IF NOT EXISTS signature_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_label TEXT,
        variable_id TEXT,
        x_pos INTEGER,
        y_pos INTEGER,
        font_family TEXT,
        font_size INTEGER,
        font_color TEXT,
        font_weight TEXT,
        letter_spacing REAL
    )`);

    // Table: user_data
    db.run(`CREATE TABLE IF NOT EXISTS user_data (
        user_identifier TEXT PRIMARY KEY,
        payload TEXT
    )`);

    // Table: custom_fonts
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
