const fs = require('fs');
const path = require('path');
const db = require('../config/database');

exports.getFonts = async (req, res) => {
    try {
        const fontsDir = path.join(__dirname, '../../fonts');
        if (!fs.existsSync(fontsDir)) {
            return res.json([]);
        }

        const files = fs.readdirSync(fontsDir);
        const fonts = files
            .filter(file => ['.ttf', '.otf'].includes(path.extname(file).toLowerCase()))
            .map((file, index) => {
                const ext = path.extname(file);
                const basename = path.basename(file, ext);
                // Heuristic: "Roboto-Regular" -> "Roboto"
                // Or just return the filename as the name for simplicity/accuracy
                return {
                    id: index + 1, // Pseudo-ID
                    font_name: basename, // e.g. "Roboto-Regular"
                    file_path: `fonts/${file}` // Relative path for frontend
                };
            });

        res.json(fonts);
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
