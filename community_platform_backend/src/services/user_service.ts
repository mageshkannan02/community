import { prisma } from "../config/prisma";
import { CreateUserInput, UpdateUserInput, USER_OMIT_PASSWORD_SELECT } from "../types/user";

export const find_user_by_id = async (id: string) => {
  return await prisma.users.findFirst({
    where: {
      id: id,
      is_active: true,
    },
    select: USER_OMIT_PASSWORD_SELECT,
  });
};

export const find_user_by_name = async (full_name: string) => {
  return await prisma.users.findFirst({
    where: {
      full_name: full_name,
      is_active: true,
    },
  });
};

export const find_default_role = async () => {
  const role = await prisma.rolesMaster.findFirst({
    where: { name: { contains: "user", mode: "insensitive" } },
  });
  if (role) return role;
  return await prisma.rolesMaster.findFirst();
};

export const find_user_by_email = async (email: string) => {
  return await prisma.users.findFirst({
    where: {
      email: email,
    },
    include:{
      role:true
    },
  });
};

export const find_all_users = async (where: any, skip: number, take: number) => {
  return await prisma.users.findMany({
    where,
    skip,
    take,
    select: USER_OMIT_PASSWORD_SELECT,
  });
};

export const count_users = async (where: any) => {
  return await prisma.users.count({ where });
};

export const insert_user = async (data: CreateUserInput) => {
  return await prisma.users.create({
    data: {
      ...data,
      updated_at: new Date(),
    },
    select: USER_OMIT_PASSWORD_SELECT,
  });
};

export const update_user = async (id: string, data: UpdateUserInput) => {
  return await prisma.users.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
    select: USER_OMIT_PASSWORD_SELECT,
  });
};

export const soft_delete_user = async (id: string) => {
  return await prisma.users.update({
    where: { id },
    data: {
      is_active: false,
      updated_at: new Date(),
    },
    select: USER_OMIT_PASSWORD_SELECT,
  });
};

export const update_user_password = async (id: string, password_hash: string) => {
  return await prisma.users.update({
    where: { id },
    data: {
      password: password_hash,
      updated_at: new Date(),
    },
    select: USER_OMIT_PASSWORD_SELECT,
  });
};

