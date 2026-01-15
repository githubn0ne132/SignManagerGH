const db = require('../config/database');

exports.getUserData = async (req, res) => {
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
};

exports.saveUserData = async (req, res) => {
    const userIdentifier = req.params.id;
    const payload = JSON.stringify(req.body);

    try {
        await db.run(`INSERT OR REPLACE INTO user_data (user_identifier, payload) VALUES (?, ?)`, [userIdentifier, payload]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
