const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result.secure_url);
      },
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

const getCloudinaryPublicId = (assetUrl) => {
  if (typeof assetUrl !== "string" || !assetUrl) return null;

  try {
    const url = new URL(assetUrl);

    if (url.hostname !== "res.cloudinary.com") return null;

    const uploadMarker = "/image/upload/";
    const uploadIndex = url.pathname.indexOf(uploadMarker);

    if (uploadIndex === -1) return null;

    const assetPath = decodeURIComponent(
      url.pathname.slice(uploadIndex + uploadMarker.length),
    )
      .replace(/^v\d+\//, "")
      .replace(/\.[^/.]+$/, "");

    return assetPath || null;
  } catch {
    return null;
  }
};

const deleteCloudinaryAsset = async (assetUrl) => {
  const publicId = getCloudinaryPublicId(assetUrl);

  if (!publicId) return false;

  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  return true;
};

uploadToCloudinary.deleteCloudinaryAsset = deleteCloudinaryAsset;

module.exports = uploadToCloudinary;
