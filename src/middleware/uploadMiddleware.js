const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'fontFile') {
            cb(null, 'fonts/');
        } else {
            cb(null, 'uploads/');
        }
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
