const db = require('../config/database');
const { generateSignature } = require('../services/imageGenerator');

exports.getHtmlSnippet = async (req, res) => {
    const userId = req.params.userId;
    try {
        // Fetch user data
        const userRow = await db.get("SELECT payload, public_id FROM user_data WHERE user_identifier = ?", [userId]);
        const userData = userRow ? JSON.parse(userRow.payload) : {};

        if (!userRow) {
            return res.status(404).send("User not found");
        }

        const host = req.get('host');
        const protocol = req.protocol;
        const fullUrl = `${protocol}://${host}/signature/${userRow.public_id}/image.png`;

        // Fetch active template fields to determine what variables to show
        // We'll just grab the first two variable IDs from the active template's fields
        let altText = "Signature";
        const templateRow = await db.get("SELECT id, redirect_url FROM templates WHERE is_active = 1 LIMIT 1");

        let redirectUrl = "#";
        if (templateRow) {
            if (templateRow.redirect_url) {
                redirectUrl = templateRow.redirect_url;
            }

            const fields = await db.all("SELECT variable_id FROM signature_fields WHERE template_id = ? ORDER BY id ASC LIMIT 2", [templateRow.id]);
            const values = fields.map(f => userData[f.variable_id]).filter(v => v);
            if (values.length > 0) {
                altText = values.join(' ');
            }
        }

        const timestamp = new Date().getTime();

        const html = `<a href="${redirectUrl}"><img src="${fullUrl}?t=${timestamp}" alt="${altText}" crossorigin="anonymous"></a>`;
        res.send(html);
    } catch (err) {
        console.error("Error generating HTML snippet:", err);
        res.status(500).send("Error generating HTML");
    }
};

exports.getSignatureImage = async (req, res) => {
    const publicId = req.params.publicId;

    try {
        // 1. Get User Data
        const userRow = await db.get("SELECT payload FROM user_data WHERE public_id = ?", [publicId]);
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
