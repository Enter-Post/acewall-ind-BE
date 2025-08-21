import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import dotenv from "dotenv";
import path from "path";
import fs from "fs"; // you won't need it now but you can keep it if you delete temp files elsewhere

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export const uploadToCloudinary = async (fileBuffer, folder = "", filename = "") => {
  try {
    // Determine file extension
    const ext = path.extname(filename).toLowerCase();

    // If it's a PDF, use 'raw'
    // const resourceType = ext === ".pdf" ? "raw" : "auto";
    const resourceType = "auto";

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType, // 👈 dynamic resource type
        },
        (error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      original_filename: result.original_filename,
    };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};

