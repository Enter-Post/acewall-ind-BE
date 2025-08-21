import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

const lessonUploadMiddleware = upload.any();    

export default lessonUploadMiddleware;