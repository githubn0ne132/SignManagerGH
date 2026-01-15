const db = require('../config/database');

exports.getFields = async (req, res) => {
    const templateId = req.query.template_id;

    try {
        if (templateId) {
            const rows = await db.all("SELECT * FROM signature_fields WHERE template_id = ?", [templateId]);
            res.json(rows);
        } else {
            // Get active template
            const activeTemplate = await db.get("SELECT id FROM templates WHERE is_active = 1 LIMIT 1");
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
};

exports.saveField = async (req, res) => {
    const { id, template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing } = req.body;

    if (!template_id) return res.status(400).json({ error: 'template_id is required' });

    try {
        if (id) {
            // Update
            const sql = `UPDATE signature_fields SET field_label=?, variable_id=?, x_pos=?, y_pos=?, font_family=?, font_size=?, font_color=?, font_weight=?, letter_spacing=? WHERE id=?`;
            const params = [field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing, id];
            await db.run(sql, params);
            res.json({ id });
        } else {
            // Create
            const sql = `INSERT INTO signature_fields (template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing) VALUES (?,?,?,?,?,?,?,?,?,?)`;
            const params = [template_id, field_label, variable_id, x_pos, y_pos, font_family, font_size, font_color, font_weight, letter_spacing];
            const result = await db.run(sql, params);
            res.json({ id: result.lastID });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteField = async (req, res) => {
    try {
        const result = await db.run("DELETE FROM signature_fields WHERE id=?", [req.params.id]);
        res.json({ deleted: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
