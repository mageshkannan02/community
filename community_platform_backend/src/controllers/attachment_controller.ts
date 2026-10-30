import { Request, Response } from "express";
import {
  ApiResponse,
  asyncHandler,
  BadRequestError,
  getPagination,
} from "../utils";
import {
  getPresignedUrlSchema,
  confirmAttachmentSchema,
  directUploadSchema,
  getAttachmentByIdSchema,
  getAttachmentsByEntitySchema,
} from "../validators/attachment_validator";
import * as attachmentService from "../services/attachment_service";

export const getPresignedUploadUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = getPresignedUrlSchema.parse(req.body);
    const uploaderId = (req as any).user?.user_id;

    if (!uploaderId) {
      throw new BadRequestError("User must be authenticated");
    }

    const result = await attachmentService.requestPresignedUpload(
      uploaderId,
      parsedData
    );

    return ApiResponse.success(
      res,
      result,
      "Presigned upload URL generated successfully"
    );
  }
);

export const confirmAttachment = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = confirmAttachmentSchema.parse(req.body);
    const uploaderId = (req as any).user?.user_id;

    if (!uploaderId) {
      throw new BadRequestError("User must be authenticated");
    }

    const attachment = await attachmentService.createAttachmentRecord(
      uploaderId,
      parsedData
    );

    return ApiResponse.success(
      res,
      attachment,
      "Attachment created successfully",
      201
    );
  }
);

export const directUpload = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new BadRequestError("No file provided for upload");
    }

    const parsedData = directUploadSchema.parse(req.body);
    const uploaderId = (req as any).user?.user_id;

    if (!uploaderId) {
      throw new BadRequestError("User must be authenticated");
    }

    const attachment = await attachmentService.directUploadAttachment(
      uploaderId,
      req.file,
      parsedData.entity_id,
      parsedData.entity_type
    );

    return ApiResponse.success(
      res,
      attachment,
      "File uploaded and attachment created successfully",
      201
    );
  }
);

export const getAttachmentById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = getAttachmentByIdSchema.parse(req.params);
    const attachment = await attachmentService.getAttachmentById(id);

    return ApiResponse.success(
      res,
      attachment,
      "Attachment fetched successfully"
    );
  }
);

export const getAttachmentsByEntity = asyncHandler(
  async (req: Request, res: Response) => {
    const { entity_id } = getAttachmentsByEntitySchema.parse({
      entity_id: req.params.entity_id,
    });
    const entity_type = req.query.entity_type as string | undefined;

    const { limit, skip, page } = getPagination(req);
    const { total, attachments } = await attachmentService.getAttachmentsByEntity(
      entity_id,
      entity_type,
      limit,
      skip
    );

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      attachments,
      "Attachments fetched successfully",
      200,
      {
        total,
        page,
        limit,
        totalPages,
      }
    );
  }
);

export const deleteAttachment = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = getAttachmentByIdSchema.parse(req.params);
    const userId = (req as any).user?.user_id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      throw new BadRequestError("User must be authenticated");
    }

    await attachmentService.deleteAttachment(id, userId, userRole);

    return ApiResponse.success(res, null, "Attachment deleted successfully");
  }
);
