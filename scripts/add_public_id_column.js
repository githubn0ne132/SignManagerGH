const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../signature_app.db');
const db = new sqlite3.Database(dbPath);

function generateId() {
    return crypto.randomBytes(3).toString('hex');
}

db.serialize(() => {
    // 1. Check if column exists (naive check: just try to add it, if it fails, ignore)
    // SQLite doesn't strictly support IF NOT EXISTS in ADD COLUMN standardly in all versions, 
    // but usually we can check schema or just catch error.
    // However, for this environment, simpler to just select * from user_data limit 1 to see keys.

    db.all("PRAGMA table_info(user_data)", (err, rows) => {
        if (err) {
            console.error("Error getting table info:", err);
            return;
        }

        const hasPublicId = rows.some(r => r.name === 'public_id');

        if (!hasPublicId) {
            console.log("Adding public_id column...");
            db.run("ALTER TABLE user_data ADD COLUMN public_id TEXT", (err) => {
                if (err) {
                    console.error("Error adding column:", err);
                    return;
                }
                console.log("Column added. Backfilling data...");
                backfill();
            });
        } else {
            console.log("Column public_id already exists. Checking for nulls...");
            backfill();
        }
    });
});

function backfill() {
    db.all("SELECT user_identifier FROM user_data WHERE public_id IS NULL", (err, rows) => {
        if (err) {
            console.error("Error fetching users:", err);
            return;
        }

        if (rows.length === 0) {
            console.log("No users needed backfill.");
            return;
        }

        console.log(`Backfilling ${rows.length} users...`);

        const stmt = db.prepare("UPDATE user_data SET public_id = ? WHERE user_identifier = ?");

        rows.forEach(row => {
            const newId = generateId();
            stmt.run(newId, row.user_identifier, (err) => {
                if (err) console.error(`Failed to update ${row.user_identifier}:`, err);
                else console.log(`Updated ${row.user_identifier} with ${newId}`);
            });
        });

        stmt.finalize(() => {
            console.log("Backfill complete.");
        });
    });
}
