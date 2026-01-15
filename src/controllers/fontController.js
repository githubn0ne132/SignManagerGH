const db = require('../config/database');

exports.getFonts = async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM custom_fonts");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.uploadFont = async (req, res) => {
    const { font_name } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const sql = `INSERT INTO custom_fonts (font_name, file_path) VALUES (?, ?)`;
        const result = await db.run(sql, [font_name, req.file.path]);
        res.json({ id: result.lastID, font_name, file_path: req.file.path });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
