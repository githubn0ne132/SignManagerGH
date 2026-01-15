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
        // Check if user exists
        const existingUser = await db.get("SELECT public_id FROM user_data WHERE user_identifier = ?", [userIdentifier]);

        if (existingUser) {
            // Update existing user
            await db.run("UPDATE user_data SET payload = ? WHERE user_identifier = ?", [payload, userIdentifier]);
            res.json({ success: true, publicId: existingUser.public_id });
        } else {
            // Create new user
            const crypto = require('crypto');
            const publicId = crypto.randomBytes(3).toString('hex');
            await db.run("INSERT INTO user_data (user_identifier, payload, public_id) VALUES (?, ?, ?)", [userIdentifier, payload, publicId]);
            res.json({ success: true, publicId: publicId });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
