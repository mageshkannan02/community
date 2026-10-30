import {
  asyncHandler,
  ConflictError,
  ApiResponse,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from "../utils";
import { Request, Response } from "express";
import {
  createUserSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators";
import * as userService from "../services/user_service";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

import { prisma } from "../config/prisma";

export const handle_register = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = createUserSchema.parse(req.body);
    const existing_user = await userService.find_user_by_email(
      parsedData.email,
    );
    if (existing_user)
      throw new ConflictError("User with this email already exists");

    const existing_name = await userService.find_user_by_name(
      parsedData.full_name,
    );
    if (existing_name)
      throw new ConflictError("User with this full name already exists");

    let role_id = parsedData.role_id;
    if (parsedData.role_name && !role_id) {
      const namedRole = await prisma.rolesMaster.findFirst({
        where: { name: { equals: parsedData.role_name, mode: "insensitive" } },
      });
      if (namedRole) {
        role_id = namedRole.id;
      }
    }
    if (role_id) {
      const roleExists = await prisma.rolesMaster.findUnique({
        where: { id: role_id },
      });
      if (!roleExists) {
        role_id = undefined;
      }
    }

    if (!role_id) {
      const defaultRole =
        (await prisma.rolesMaster.findFirst({
          where: { name: "Member", is_active: true },
        })) ||
        (await prisma.rolesMaster.findFirst({
          where: { is_active: true },
        }));
      if (defaultRole) {
        role_id = defaultRole.id;
      } else {
        throw new BadRequestError("No active system roles found. Please run seed script.");
      }
    }

    const hashedPassword = await bcrypt.hash(parsedData.password, 10);
    const { role_name: _ignoredRoleName, ...cleanData } = parsedData as any;
    const user_data = {
      ...cleanData,
      role_id,
      password: hashedPassword,
      is_active: parsedData.is_active ?? true,
    };

    const createdUser = await userService.insert_user(user_data as any);
    return ApiResponse.success(
      res,
      createdUser,
      "User created successfully",
      201,
    );
  },
);

export const handle_login = asyncHandler(
  async (req: Request, res: Response) => {
    const parsedData = loginSchema.parse(req.body);
    const existing_user = await userService.find_user_by_email(
      parsedData.email,
    );

    if (!existing_user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!existing_user.is_active) {
      throw new UnauthorizedError("Your account is deactivated");
    }

    const is_matched = await bcrypt.compare(
      parsedData.password,
      existing_user.password,
    );
    if (!is_matched) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const role_name = existing_user.role?.name || "Member";
    const jwt_payload = {
      user_id: existing_user.id,
      email: existing_user.email,
      role: role_name,
    };

    const token = jwt.sign(jwt_payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
    const refresh_token = jwt.sign(jwt_payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    const userProfile = {
      id: existing_user.id,
      full_name: existing_user.full_name,
      email: existing_user.email,
      role_id: existing_user.role_id,
      role: existing_user.role,
      avatar_url: existing_user.avatar_url,
      bio: existing_user.bio,
      bio_visibility: existing_user.bio_visibility,
      is_active: existing_user.is_active,
      created_at: existing_user.created_at,
    };

    return ApiResponse.success(
      res,
      { token, refresh_token, user: userProfile },
      "Login successful",
    );
  },
);

export const handle_generate_refresh_token = asyncHandler(
  async (req: Request, res: Response) => {
    const { refresh_token } = refreshTokenSchema.parse(req.body);

    let decodedToken: any;
    try {
      decodedToken = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET);
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const jwt_payload = {
      user_id: decodedToken.user_id,
      email: decodedToken.email,
      role: decodedToken.role,
    };

    const new_token = jwt.sign(jwt_payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
    const new_refresh_token = jwt.sign(jwt_payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return ApiResponse.success(
      res,
      { token: new_token, refresh_token: new_refresh_token },
      "Refresh token generated successfully",
    );
  },
);



export const handle_reset_password = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, email, new_password } = resetPasswordSchema.parse(req.body);

    let targetUser: any = null;

    if (token) {
      let decodedToken: any;
      try {
        decodedToken = jwt.verify(token, env.JWT_SECRET);
      } catch (error) {
        throw new UnauthorizedError("Invalid or expired password reset token");
      }

      if (decodedToken.user_id || decodedToken.id) {
        targetUser = await prisma.users.findUnique({ where: { id: decodedToken.user_id || decodedToken.id } });
      }
      if (!targetUser && decodedToken.email) {
        targetUser = await userService.find_user_by_email(decodedToken.email);
      }
      if (!targetUser && decodedToken.full_name) {
        targetUser = await userService.find_user_by_name(decodedToken.full_name);
      }
    } else if (email) {
      targetUser = await userService.find_user_by_email(email);
    }

    if (!targetUser) {
      throw new BadRequestError("User account not found");
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await userService.update_user_password(
      targetUser.id,
      hashedPassword,
    );

    return ApiResponse.success(
      res,
      { email: targetUser.email, full_name: targetUser.full_name },
      "Password has been reset successfully",
    );
  },
);

export const handle_forgot_password = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const existing_user = await userService.find_user_by_email(email);

    if (!existing_user) {
      // Return success even if not found to prevent user enumeration
      return ApiResponse.success(
        res,
        null,
        "If an account with this email exists, a reset instructions token was generated.",
      );
    }

    const reset_token = jwt.sign(
      { id: existing_user.id, user_id: existing_user.id, email: existing_user.email, full_name: existing_user.full_name },
      env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    return ApiResponse.success(
      res,
      { reset_token, email: existing_user.email, full_name: existing_user.full_name },
      "Password reset token generated successfully. Valid for 30 minutes.",
    );
  },
);

export const handle_logout = asyncHandler(
  async (req: Request, res: Response) => {
    const refresh_token = req.body?.refresh_token;
    if (refresh_token) {
      try {
        const decoded: any = jwt.decode(refresh_token);
        const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 86400000);
        await prisma.refreshTokenBlacklist.create({
          data: {
            token_hash: refresh_token,
            user_id: decoded?.user_id || null,
            expires_at: expiresAt,
          },
        });
      } catch {
        // Ignore invalid token on logout
      }
    }

    return ApiResponse.success(res, null, "Logged out successfully");
  },
);

export const handle_me = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.user_id;
    if (!userId) {
      throw new UnauthorizedError("User is not authenticated");
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        avatar_url: true,
        bio: true,
        bio_visibility: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
          },
        },
        _count: {
          select: {
            followed_users: true,
            following_users: true,
            owned_communities: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return ApiResponse.success(res, user, "Current user profile fetched successfully");
  },
);

