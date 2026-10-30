import { Request, Response, NextFunction } from "express";
import {
  processAssistantChat,
  getConversations,
  getConversationById,
  deleteConversation,
} from "../services/assistant_service";

export const handle_assistant_chat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, conversation_id, community_id, history, user_profile } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: "Message is required and must be a non-empty string." },
      });
    }

    const authUser = (req as any).user;
    const effectiveProfile = user_profile || (authUser ? {
      id: authUser.id,
      name: authUser.full_name,
      email: authUser.email,
      role: authUser.role?.name,
      bio: authUser.bio,
    } : undefined);

    const result = await processAssistantChat({
      message: message.trim(),
      conversation_id,
      community_id,
      user_id: authUser?.id || effectiveProfile?.id,
      user_profile: effectiveProfile,
      history,
    });

    return res.status(200).json({
      success: true,
      message: "AI response generated successfully",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};

export const handle_get_conversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const conversations = getConversations(userId);

    return res.status(200).json({
      success: true,
      message: "Conversations retrieved successfully",
      data: conversations,
    });
  } catch (error: any) {
    next(error);
  }
};

export const handle_get_conversation_by_id = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const conv = getConversationById(id);

    if (!conv) {
      return res.status(404).json({
        success: false,
        error: { message: "Conversation not found" },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Conversation retrieved successfully",
      data: conv,
    });
  } catch (error: any) {
    next(error);
  }
};

export const handle_delete_conversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const deleted = deleteConversation(id);

    return res.status(200).json({
      success: true,
      message: deleted ? "Conversation deleted successfully" : "Conversation not found or already deleted",
      data: { deleted },
    });
  } catch (error: any) {
    next(error);
  }
};
