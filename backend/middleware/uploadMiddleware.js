const multer = require("multer");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const storage = multer.memoryStorage();

const multerUpload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error(
        "Only JPEG, PNG, WebP, GIF and AVIF images are allowed",
      );
      error.code = "INVALID_IMAGE_TYPE";
      return callback(error);
    }

    callback(null, true);
  },
});

function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }

  const header = buffer.subarray(0, 6).toString("ascii");
  if (header === "GIF87a" || header === "GIF89a") {
    return "image/gif";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
    ["avif", "avis"].includes(buffer.subarray(8, 12).toString("ascii"))
  ) {
    return "image/avif";
  }

  return null;
}

function single(fieldName) {
  const parseSingleFile = multerUpload.single(fieldName);

  return (req, res, next) => {
    parseSingleFile(req, res, (error) => {
      if (error) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "Image must be 5 MB or smaller"
            : error.code === "LIMIT_FILE_COUNT"
              ? "Only one image can be uploaded"
              : error.message || "Invalid image upload";

        return res.status(400).json({ message });
      }

      if (req.file && detectImageType(req.file.buffer) !== req.file.mimetype) {
        return res.status(400).json({
          message: "Uploaded file content does not match a supported image type",
        });
      }

      next();
    });
  };
}

const upload = { single };

module.exports = upload;
