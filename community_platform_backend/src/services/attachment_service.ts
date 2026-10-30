import { prisma } from "../config/prisma";
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  generateS3Key,
  uploadFileToS3,
  deleteFileFromS3,
  checkFileExistsInS3,
  getS3FileUrl,
  isAllowedMimeType,
  MAX_FILE_SIZE_BYTES,
} from "./s3_service";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils";

export interface RequestPresignedUploadParams {
  entity_id: string;
  entity_type?: string;
  file_name: string;
  file_type: string;
  file_size?: number;
}

export interface ConfirmAttachmentParams {
  entity_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  s3_key: string;
  entity_type?: string;
}

export async function requestPresignedUpload(
  uploaderId: string,
  params: RequestPresignedUploadParams
) {
  if (!isAllowedMimeType(params.file_type)) {
    throw new BadRequestError(`Unsupported file type: ${params.file_type}`);
  }

  if (params.file_size && params.file_size > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(
      `File size exceeds limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
    );
  }

  const s3Key = generateS3Key({
    uploaderId,
    entityType: params.entity_type,
    fileName: params.file_name,
  });

  const presignedData = await generatePresignedUploadUrl(
    s3Key,
    params.file_type
  );

  return {
    ...presignedData,
    entity_id: params.entity_id,
    entity_type: params.entity_type || "general",
    file_name: params.file_name,
    file_type: params.file_type,
    file_size: params.file_size,
  };
}

export async function createAttachmentRecord(
  uploaderId: string,
  params: ConfirmAttachmentParams
) {
  const s3Metadata = await checkFileExistsInS3(params.s3_key);
  if (!s3Metadata) {
    throw new BadRequestError(
      "Uploaded file was not found in S3 storage. Please complete upload to S3 first."
    );
  }

  const verifiedSize = s3Metadata.contentLength ?? params.file_size;
  const verifiedType = s3Metadata.contentType || params.file_type;
  const fileUrl = getS3FileUrl(params.s3_key);

  return prisma.attachments.create({
    data: {
      entity_id: params.entity_id,
      uploader_id: uploaderId,
      file_url: fileUrl,
      file_name: params.file_name,
      file_type: verifiedType,
      file_size: verifiedSize,
      s3_key: params.s3_key,
      entity_type: params.entity_type || "general",
    },
    include: {
      uploaded_by: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          email: true,
        },
      },
    },
  });
}

export async function directUploadAttachment(
  uploaderId: string,
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  },
  entityId: string,
  entityType: string = "general"
) {
  if (!isAllowedMimeType(file.mimetype)) {
    throw new BadRequestError(`Unsupported file type: ${file.mimetype}`);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(
      `File size exceeds limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
    );
  }

  const s3Key = generateS3Key({
    uploaderId,
    entityType,
    fileName: file.originalname,
  });

  const fileUrl = await uploadFileToS3(s3Key, file.buffer, file.mimetype);

  return prisma.attachments.create({
    data: {
      entity_id: entityId,
      uploader_id: uploaderId,
      file_url: fileUrl,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      s3_key: s3Key,
      entity_type: entityType,
    },
    include: {
      uploaded_by: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          email: true,
        },
      },
    },
  });
}

export async function getAttachmentById(attachmentId: string) {
  const attachment = await prisma.attachments.findUnique({
    where: { id: attachmentId },
    include: {
      uploaded_by: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          email: true,
        },
      },
    },
  });

  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  const downloadUrl = await generatePresignedDownloadUrl(
    attachment.s3_key,
    3600,
    attachment.file_name
  );

  return {
    ...attachment,
    download_url: downloadUrl,
  };
}

export async function getAttachmentsByEntity(
  entityId: string,
  entityType?: string,
  limit?: number,
  skip?: number
) {
  const whereClause: any = { entity_id: entityId };
  if (entityType) {
    whereClause.entity_type = entityType;
  }

  const [total, attachments] = await Promise.all([
    prisma.attachments.count({ where: whereClause }),
    prisma.attachments.findMany({
      where: whereClause,
      take: limit,
      skip: skip,
      orderBy: { created_at: "desc" },
      include: {
        uploaded_by: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    attachments,
  };
}

export async function deleteAttachment(
  attachmentId: string,
  userId: string,
  userRole?: string
) {
  const attachment = await prisma.attachments.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  const isAdmin = userRole === "admin" || userRole === "ADMIN";
  if (attachment.uploader_id !== userId && !isAdmin) {
    throw new ForbiddenError("You are not authorized to delete this attachment");
  }

  try {
    await deleteFileFromS3(attachment.s3_key);
  } catch (error) {
    console.error(`Failed to delete object ${attachment.s3_key} from S3:`, error);
  }

  await prisma.attachments.delete({
    where: { id: attachmentId },
  });

  return { id: attachmentId };
}
