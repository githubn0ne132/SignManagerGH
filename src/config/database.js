const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize DB
const dbPath = path.resolve(__dirname, '../../signature_app.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to database');
    }
});

/**
 * Promisified db.get
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<any>}
 */
const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

/**
 * Promisified db.all
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array>}
 */
const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

/**
 * Promisified db.run
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<{lastID: number, changes: number}>}
 */
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

module.exports = {
    db,
    get,
    all,
    run
};
