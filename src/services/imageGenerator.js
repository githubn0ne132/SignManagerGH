const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// --- Font Registration Helper ---
// We need to register fonts before using them in Canvas.
// We'll iterate through the custom_fonts directory or DB records if possible,
// but for now, let's strictly rely on what's available or passed in.
// In a real app, 'registerFont' should be called once at startup for known fonts.
// Doing it per-request *might* be okay but efficiency is key.
// Let's assume we register all fonts in 'fonts/' directory on module load.

const fontsDir = path.join(__dirname, '../fonts');
if (fs.existsSync(fontsDir)) {
    fs.readdirSync(fontsDir).forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (['.ttf', '.otf'].includes(ext)) {
            // We use the filename (without ext) as the font family name by default
            // or we could try to parse metadata. For simplicity -> filename base.
            // OR the user inputs the font family name when uploading.
            // Since we don't have that mapping easily available here without DB query,
            // we might need to rely on the app to pass correct font paths or load dynamically.

            // For now, let's register generic system fonts if we had them.
            // But actually, registerFont requires a path.
            // Let's create a function to register a specific font family if needed.
            // registerFont(path.join(fontsDir, file), { family: path.basename(file, ext) });
        }
    });
}

/**
 * Generates a signature image.
 * 
 * @param {Object} templateConfig - { bg_image_path, canvas_width, canvas_height }
 * @param {Array} fields - Array of field objects { x_pos, y_pos, font_family, font_size, font_color, variable_id, ... }
 * @param {Object} userData - Key-value map of user data { variable_id: "Value" }
 * @param {Array} customFonts - Array of { font_name, file_path } to register.
 * @returns {Promise<Buffer>} PNG Buffer
 */
async function generateSignature(templateConfig, fields = [], userData = {}, customFonts = []) {
    const width = templateConfig.canvas_width || 600;
    const height = templateConfig.canvas_height || 200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Register Custom Fonts
    // We register them with the family name stored in DB.
    // If multiple requests try to register the same font, Canvas handles it (idempotent-ish).
    if (customFonts && customFonts.length > 0) {
        customFonts.forEach(font => {
            if (font.file_path && fs.existsSync(font.file_path)) {
                registerFont(font.file_path, { family: font.font_name });
            }
        });
    }

    // 2. Background
    if (templateConfig.bg_image_path) {
        try {
            const bgImage = await loadImage(templateConfig.bg_image_path);
            ctx.drawImage(bgImage, 0, 0, width, height);
        } catch (e) {
            console.error("Failed to load background image:", e);
            // Fallback: white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }

    // 3. Text Fields
    fields.forEach(field => {
        const text = userData[field.variable_id] || '';
        if (!text) return;

        // Font Style
        // Format: "italic bold 20px 'Font Name'"
        const weight = field.font_weight || 'normal';
        // Check if font_family has spaces, if so wrap in quotes? Canvas usually handles this but good to be safe.
        const family = field.font_family ? `'${field.font_family}'` : 'Arial';
        ctx.font = `${weight} ${field.font_size || 16}px ${family}`;
        ctx.fillStyle = field.font_color || '#000000';
        ctx.textBaseline = 'top'; // Matches Fabric.js default usually, or adjustment needed.

        // Letter Spacing (Canvas API doesn't fully support letterSpacing property directly in all versions,
        // but recent versions do via ctx.letterSpacing = '1px')
        if (field.letter_spacing) {
            // Node-canvas 2.10+ supports this.
            ctx.letterSpacing = `${field.letter_spacing}px`;
        }

        ctx.fillText(text, field.x_pos || 0, field.y_pos || 0);
    });

    return canvas.toBuffer('image/png');
}

module.exports = { generateSignature };
