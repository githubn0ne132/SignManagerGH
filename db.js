const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const util = require('util');

// Create/Open Database
const dbPath = path.resolve(__dirname, 'signature_app.db');
const db = new sqlite3.Database(dbPath);

// Promisify Standard Methods
db.getAsync = util.promisify(db.get);
db.allAsync = util.promisify(db.all);

// Custom Promisified 'run' to return context (lastID, changes)
db.runAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

// Initialize Schema
db.serialize(() => {
    // 1. Templates Table
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

    // 2. Signature Fields Table
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

    // 3. User Data Table
    db.run(`CREATE TABLE IF NOT EXISTS user_data (
        user_identifier TEXT PRIMARY KEY,
        payload TEXT
    )`);

    // 4. Custom Fonts Table
    db.run(`CREATE TABLE IF NOT EXISTS custom_fonts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        font_name TEXT,
        file_path TEXT
    )`, (err) => {
        if (!err) {
            console.log("Database initialized and connected.");
        }
    });
});

// Export Wrapper
module.exports = {
    get: (sql, params) => db.getAsync(sql, params),
    all: (sql, params) => db.allAsync(sql, params),
    run: (sql, params) => db.runAsync(sql, params),
    // Expose raw db just in case, though we should avoid using it
    raw: db,
    serialize: (cb) => db.serialize(cb)
};
