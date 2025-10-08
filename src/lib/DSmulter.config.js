import multer from "multer";
import path from "path";

const FILE_SIZE_LIMIT = 50 * 1024 * 1024;

// Configure storage dynamically
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'file'; // default
    if (file.mimetype.startsWith('video/')) folder = 'videos';
    else if (file.mimetype.startsWith('image/')) folder = 'image';
    cb(null, `uploads/${folder}`);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: FILE_SIZE_LIMIT },
});

export { upload };