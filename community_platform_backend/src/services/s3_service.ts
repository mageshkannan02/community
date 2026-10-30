import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET_NAME, AWS_REGION } from "../config/s3";
import { env } from "../config/env";
import crypto from "crypto";
import path from "path";

export interface GenerateKeyOptions {
  uploaderId: string;
  entityType?: string;
  fileName: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  s3Key: string;
  fileUrl: string;
  expiresIn: number;
}

export interface S3ObjectMetadata {
  contentLength?: number;
  contentType?: string;
  eTag?: string;
  lastModified?: Date;
}

export const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  // Audio & Video
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

export function generateS3Key(options: GenerateKeyOptions): string {
  const ext = path.extname(options.fileName).toLowerCase();
  const baseName = path
    .basename(options.fileName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50);

  const entityFolder = (options.entityType || "general")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();

  return `attachments/${entityFolder}/${options.uploaderId}/${timestamp}-${randomSuffix}-${baseName}${ext}`;
}

export function getS3FileUrl(key: string): string {
  if (env.AWS_CLOUDFRONT_URL) {
    const cdnBase = env.AWS_CLOUDFRONT_URL.replace(/\/+$/, "");
    return `${cdnBase}/${key}`;
  }
  return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<PresignedUploadResult> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: "AES256",
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const fileUrl = getS3FileUrl(key);

  return {
    uploadUrl,
    s3Key: key,
    fileUrl,
    expiresIn,
  };
}

export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
  fileName?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: fileName
      ? `inline; filename="${encodeURIComponent(fileName)}"`
      : undefined,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function checkFileExistsInS3(
  key: string
): Promise<S3ObjectMetadata | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);
    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      eTag: response.ETag,
      lastModified: response.LastModified,
    };
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function uploadFileToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: "AES256",
  });

  await s3Client.send(command);
  return getS3FileUrl(key);
}

export async function deleteFileFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}
