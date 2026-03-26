import multer from "multer";

// ✅ Use memory storage instead of multer-s3
const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },

  fileFilter: (req, file, cb) => {
    // ✅ Allow only images
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

export default upload;