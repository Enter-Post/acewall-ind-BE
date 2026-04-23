import { google } from "googleapis";
import { pipeline } from "stream/promises";

import cloudinary from "cloudinary";
import { asyncHandler } from "../middlewares/errorHandler.middleware.js";
import User from "../Models/user.model.js";
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
} from "../Utiles/errors.js";
import { AppError as ApiError } from "../Utiles/errors.js";
import {
  getValidAccessToken,
  createOAuth2Client,
} from "./googleDrive.controller.js";

// Configure Cloudinary
const cloudinaryV2 = cloudinary.v2;

/**
 * Upload file from Google Drive to Cloudinary
 * POST /api/drive/upload
 */
export const uploadFromGoogleDrive = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { fileId, fileName, mimeType } = req.body;

  if (!userId) {
    throw new AuthenticationError("User not authenticated", "AUTH_001");
  }

  if (!fileId) {
    throw new ValidationError("File ID is required", "VAL_001");
  }

  // Get valid access token (auto-refreshes if needed)
  const accessToken = await getValidAccessToken(userId);

  try {
    // Create Drive client
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Get file metadata first to check size
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: "id, name, mimeType, size, thumbnailLink",
    });

    const fileSize = parseInt(fileMetadata.data.size || "0");
    const maxSize = 500 * 1024 * 1024; // 500MB limit

    if (fileSize > maxSize) {
      throw new ValidationError(
        "File size exceeds 500MB limit",
        "VAL_002"
      );
    }

    // Download file as stream from Google Drive with timeout
    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      {
        responseType: "stream",
        timeout: 300000, // 5 minutes timeout for large files
        retryConfig: {
          retry: 3,
          retryDelay: 1000,
        },
      }
    );

    // Upload stream directly to Cloudinary
    const uploadResult = await uploadStreamToCloudinary(
      response.data,
      fileMetadata.data.name || fileName || "untitled",
      fileMetadata.data.mimeType || mimeType
    );

    // Return Cloudinary response
    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        filename: uploadResult.original_filename || fileMetadata.data.name,
        format: uploadResult.format,
        resourceType: uploadResult.resource_type,
        size: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
      },
      source: "google_drive",
    });
  } catch (error) {
    console.error("Google Drive upload error:", error);

    // Handle specific Google Drive errors
    if (error.code === 404) {
      throw new NotFoundError("File not found in Google Drive", "DRIVE_003");
    }

    if (error.code === 403) {
      throw new AuthenticationError(
        "Permission denied for this file",
        "DRIVE_004"
      );
    }

    throw new ApiError(
      error.message || "Failed to upload file from Google Drive",
      500,
      "DRIVE_005"
    );
  }
});

/**
 * Upload file stream to Cloudinary
 * @param {stream.Readable} fileStream - File stream from Google Drive
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type of file
 * @returns {Promise} Cloudinary upload result
 */
const uploadStreamToCloudinary = (fileStream, fileName, mimeType) => {
  return new Promise((resolve, reject) => {
    // Determine resource type based on mimeType
    const resourceType = getResourceType(mimeType);

    // Determine upload options based on file type
    const uploadOptions = {
      resource_type: resourceType,
      folder: "google_drive_uploads",
      public_id: generatePublicId(fileName),
      overwrite: true,
    };

    // Add video-specific options
    if (resourceType === "video") {
      uploadOptions.chunk_size = 6000000; // 6MB chunks for large videos
    }

    // Add timeout for all uploads to prevent ECONNRESET
    uploadOptions.timeout = 300000; // 5 minutes

    const uploadStream = cloudinaryV2.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve(result);
        }
      }
    );

    // Pipe Google Drive stream to Cloudinary
    fileStream.pipe(uploadStream);

    // Handle stream errors with cleanup
    fileStream.on("error", (error) => {
      console.error("Google Drive stream error:", error);
      uploadStream.destroy();
      reject(new Error(`Stream error: ${error.message}`));
    });

    // Handle upload stream errors with cleanup
    uploadStream.on("error", (error) => {
      console.error("Cloudinary stream error:", error);
      fileStream.destroy();
      reject(new Error(`Upload stream error: ${error.message}`));
    });

    // Handle stream end/close to ensure cleanup
    uploadStream.on("close", () => {
      fileStream.destroy();
    });
  });
};

/**
 * Determine Cloudinary resource type from MIME type
 */
const getResourceType = (mimeType) => {
  if (!mimeType) return "auto";

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("image/")) {
    return "image";
  }

  // PDFs and documents are treated as raw
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("msword") ||
    mimeType.includes("officedocument")
  ) {
    return "raw";
  }

  return "auto";
};

/**
 * Generate unique public_id for Cloudinary
 */
const generatePublicId = (fileName) => {
  const timestamp = Date.now();
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .substring(0, 50);
  return `gd_${timestamp}_${sanitizedName}`;
};

/**
 * List files from user's Google Drive (for picker)
 * GET /api/drive/files
 */
export const listGoogleDriveFiles = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { folderId, pageToken, pageSize = 20, search } = req.query;

  if (!userId) {
    throw new AuthenticationError("User not authenticated", "AUTH_001");
  }

  // Get valid access token
  const accessToken = await getValidAccessToken(userId);

  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Build query
    let query = "trashed=false";

    // Only filter by folder if explicitly requested
    if (folderId && folderId !== "all") {
      if (folderId === "root") {
        query += " and 'root' in parents";
      } else {
        query += ` and '${folderId}' in parents`;
      }
    }

    if (search) {
      // Escape single quotes in search term
      const escapedSearch = search.replace(/'/g, "\\'");
      query += ` and name contains '${escapedSearch}'`;
    }

    // Only show files, not folders
    query += " and mimeType != 'application/vnd.google-apps.folder'";

    const response = await drive.files.list({
      q: query,
      pageSize: parseInt(pageSize),
      pageToken: pageToken || undefined,
      fields:
        "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, iconLink, webViewLink)",
      orderBy: "name",
    });

    const files = response.data.files || [];
    const nextPageToken = response.data.nextPageToken;

    // Transform files for frontend
    const formattedFiles = files.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: formatFileSize(file.size),
      sizeBytes: parseInt(file.size || "0"),
      modifiedTime: file.modifiedTime,
      thumbnailLink: file.thumbnailLink,
      iconLink: file.iconLink,
      webViewLink: file.webViewLink,
      type: getFileType(file.mimeType),
    }));

    return res.status(200).json({
      success: true,
      files: formattedFiles,
      nextPageToken,
      hasMore: !!nextPageToken,
    });
  } catch (error) {
    console.error("List files error:", error);
    throw new ApiError(
      error.message || "Failed to list Google Drive files",
      500,
      "DRIVE_006"
    );
  }
});

/**
 * Format file size for display
 */
const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";

  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(parseInt(bytes)) / Math.log(1024));

  return `${(parseInt(bytes) / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Get simplified file type from MIME type
 */
const getFileType = (mimeType) => {
  if (!mimeType) return "unknown";

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("document") || mimeType.includes("word"))
    return "document";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "presentation";

  return "file";
};

/**
 * Get Google Drive picker token (for frontend Google Picker API)
 * GET /api/drive/picker-token
 */
export const getGoogleDrivePickerToken = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AuthenticationError("User not authenticated", "AUTH_001");
  }

  // Get valid access token
  const accessToken = await getValidAccessToken(userId);

  return res.status(200).json({
    success: true,
    accessToken,
    // Also return app credentials needed for Picker API
    appId: process.env.GOOGLE_DRIVE_CLIENT_ID?.split("-")?.[0], // Extract app ID from client ID
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
  });
});

/**
 * Upload multiple files from Google Drive
 * POST /api/drive/upload-multiple
 */
export const uploadMultipleFromGoogleDrive = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { files } = req.body; // Array of { fileId, fileName, mimeType }

  if (!userId) {
    throw new AuthenticationError("User not authenticated", "AUTH_001");
  }

  if (!Array.isArray(files) || files.length === 0) {
    throw new ValidationError("Files array is required", "VAL_001");
  }

  if (files.length > 10) {
    throw new ValidationError("Maximum 10 files allowed at once", "VAL_003");
  }

  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      // Reuse single upload logic
      const result = await uploadSingleFileInternal(
        userId,
        file.fileId,
        file.fileName,
        file.mimeType
      );
      results.push(result);
    } catch (error) {
      errors.push({
        fileId: file.fileId,
        fileName: file.fileName,
        error: error.message,
      });
    }
  }

  return res.status(200).json({
    success: true,
    uploaded: results,
    errors: errors.length > 0 ? errors : undefined,
    totalUploaded: results.length,
    totalFailed: errors.length,
  });
});

/**
 * Internal helper for single file upload (used by bulk upload)
 */
const uploadSingleFileInternal = async (userId, fileId, fileName, mimeType) => {
  const accessToken = await getValidAccessToken(userId);

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // Get file metadata
  const fileMetadata = await drive.files.get({
    fileId: fileId,
    fields: "id, name, mimeType, size",
  });

  const fileSize = parseInt(fileMetadata.data.size || "0");
  const maxSize = 500 * 1024 * 1024;

  if (fileSize > maxSize) {
    throw new Error("File size exceeds 500MB limit");
  }

  // Download as stream
  const response = await drive.files.get(
    {
      fileId: fileId,
      alt: "media",
    },
    {
      responseType: "stream",
    }
  );

  // Upload to Cloudinary
  const uploadResult = await uploadStreamToCloudinary(
    response.data,
    fileMetadata.data.name || fileName || "untitled",
    fileMetadata.data.mimeType || mimeType
  );

  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    filename: uploadResult.original_filename,
    format: uploadResult.format,
    resourceType: uploadResult.resource_type,
    size: uploadResult.bytes,
    sourceFileId: fileId,
  };
};
