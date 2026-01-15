const db = require('../config/database');
const { generateSignature } = require('../../services/imageGenerator');

exports.getHtmlSnippet = (req, res) => {
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
};

exports.getSignatureImage = async (req, res) => {
    const userId = req.params.userId;

    try {
        // 1. Get User Data
        const userRow = await db.get("SELECT payload FROM user_data WHERE user_identifier = ?", [userId]);
        const userData = userRow ? JSON.parse(userRow.payload) : {};

        // 2. Get Active Template
        const templateRow = await db.get("SELECT * FROM templates WHERE is_active = 1 LIMIT 1");
        if (!templateRow) return res.status(404).send("No active template");

        // 3. Get Fields for this template
        const fieldRows = await db.all("SELECT * FROM signature_fields WHERE template_id = ?", [templateRow.id]);

        // 4. Get Custom Fonts
        const fontRows = await db.all("SELECT * FROM custom_fonts");

        // 5. Generate Image
        const buffer = await generateSignature(templateRow, fieldRows, userData, fontRows);
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).send("Generation Error");
    }
};
