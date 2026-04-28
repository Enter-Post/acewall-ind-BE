import express from "express";
import {
  getGoogleDriveAuthUrl,
  handleGoogleDriveCallback,
  checkDriveConnectionStatus,
  disconnectGoogleDrive,
} from "../Contollers/googleDrive.controller.js";
import {
  uploadFromGoogleDrive,
  listGoogleDriveFiles,
  getGoogleDrivePickerToken,
  uploadMultipleFromGoogleDrive,
} from "../Contollers/googleDriveUpload.controller.js";
import { isUser } from "../middlewares/Auth.Middleware.js";

const router = express.Router();

// Use isUser as isUser

/**
 * @route   GET /api/drive/auth-url
 * @desc    Generate Google Drive OAuth URL
 * @access  Private
 */
router.get("/auth-url", isUser, getGoogleDriveAuthUrl);

/**
 * @route   GET /api/drive/callback
 * @desc    Handle Google Drive OAuth callback
 * @access  Public (called by Google)
 */
router.get("/callback", handleGoogleDriveCallback);

/**
 * @route   GET /api/drive/status
 * @desc    Check Google Drive connection status
 * @access  Private
 */
router.get("/status", isUser, checkDriveConnectionStatus);

/**
 * @route   POST /api/drive/disconnect
 * @desc    Disconnect Google Drive
 * @access  Private
 */
router.post("/disconnect", isUser, disconnectGoogleDrive);

/**
 * @route   POST /api/drive/upload
 * @desc    Upload single file from Google Drive to Cloudinary
 * @access  Private
 */
router.post("/upload", isUser, uploadFromGoogleDrive);

/**
 * @route   POST /api/drive/upload-multiple
 * @desc    Upload multiple files from Google Drive
 * @access  Private
 */
router.post("/upload-multiple", isUser, uploadMultipleFromGoogleDrive);

/**
 * @route   GET /api/drive/files
 * @desc    List files from user's Google Drive
 * @access  Private
 */
router.get("/files", isUser, listGoogleDriveFiles);

/**
 * @route   GET /api/drive/picker-token
 * @desc    Get OAuth token for Google Picker API
 * @access  Private
 */
router.get("/picker-token", isUser, getGoogleDrivePickerToken);

export default router;
