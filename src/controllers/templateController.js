const db = require('../config/database');

exports.getAllTemplates = async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM templates");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getActiveTemplate = async (req, res) => {
    try {
        const row = await db.get("SELECT * FROM templates WHERE is_active = 1 LIMIT 1");
        if (!row) return res.status(404).json({ error: 'No active template found' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createTemplate = async (req, res) => {
    const { name } = req.body;
    try {
        const result = await db.run("INSERT INTO templates (name, bg_image_path, canvas_width, canvas_height, is_active) VALUES (?, NULL, 600, 200, 0)", [name]);
        res.json({ id: result.lastID, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTemplate = async (req, res) => {
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
};

exports.setActiveTemplate = async (req, res) => {
    const id = req.params.id;
    try {
        // We can't use transactions easily with strict async/await wrapper without a proper transaction connection object,
        // but sequential execution is "okay" here given SQLite's file lock.
        // A better approach in production would be to use a transaction.
        // For now, we will just await sequentially.
        await db.run("UPDATE templates SET is_active = 0");
        await db.run("UPDATE templates SET is_active = 1 WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        await db.run("DELETE FROM templates WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
