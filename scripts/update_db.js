const db = require('./src/config/database');

async function updateSchema() {
    try {
        console.log("Checking if redirect_url column exists...");
        // Check if column exists, if not add it
        // SQLite doesn't support IF NOT EXISTS for ADD COLUMN directly in standard SQL universally without checking, 
        // but it's safe to try and catch error if it exists, or check schema first.
        // Simplest way for this script:
        try {
            await db.run("ALTER TABLE templates ADD COLUMN redirect_url TEXT");
            console.log("Column redirect_url added successfully.");
        } catch (e) {
            if (e.message.includes("duplicate column name")) {
                console.log("Column redirect_url already exists.");
            } else {
                throw e;
            }
        }
    } catch (err) {
        console.error("Error updating schema:", err);
        process.exit(1);
    }
}

updateSchema();
