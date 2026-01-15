const express = require('express');

const cors = require('cors');
const path = require('path');

const templateRoutes = require('./routes/templateRoutes');
const fieldRoutes = require('./routes/fieldRoutes');
const userRoutes = require('./routes/userRoutes');
const fontRoutes = require('./routes/fontRoutes');
const signatureRoutes = require('./routes/signatureRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/fonts', express.static('fonts'));

// API Routes
app.post('/api/admin/login', (req, res) => {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.use('/api/templates', templateRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/user', userRoutes);
app.use('/api/fonts', fontRoutes);
app.use('/signature', signatureRoutes);

module.exports = app;
