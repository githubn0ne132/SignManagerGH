const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const adminAuth = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

module.exports = adminAuth;
