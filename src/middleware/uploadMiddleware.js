const multer = require('multer');
const path = require('path');

const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = 'uploads/';
        if (file.fieldname === 'fontFile') {
            dir = 'fonts/';
        }

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir);
    },
    filename: (req, file, cb) => {
        if (file.fieldname === 'fontFile') {
            cb(null, Date.now() + '-' + file.originalname);
        } else {
            cb(null, 'bg-' + Date.now() + path.extname(file.originalname));
        }
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
