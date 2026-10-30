import { prisma } from "../config/prisma";
import { cacheWrap, cacheDel } from "../utils/cache";

const CACHE_TTL_MASTER = 3600; // 1 hour

// Categories
export const getCategories = async () => {
  return await cacheWrap("master:categories:all", CACHE_TTL_MASTER, async () => {
    return await prisma.categoriesMaster.findMany({
      orderBy: { name: "asc" },
    });
  });
};

export const getCategoryById = async (id: string) => {
  return await cacheWrap(`master:categories:${id}`, CACHE_TTL_MASTER, async () => {
    return await prisma.categoriesMaster.findUnique({ where: { id } });
  });
};

export const createCategory = async (data: { name: string; description?: string; is_active?: boolean }) => {
  const result = await prisma.categoriesMaster.create({
    data: {
      ...data,
      is_active: data.is_active ?? true,
      updated_at: new Date(),
    },
  });
  await cacheDel(["master:categories:all"]);
  return result;
};

export const updateCategory = async (id: string, data: { name?: string; description?: string; is_active?: boolean }) => {
  const result = await prisma.categoriesMaster.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
  await cacheDel(["master:categories:all", `master:categories:${id}`]);
  return result;
};

export const deleteCategory = async (id: string) => {
  const result = await prisma.categoriesMaster.delete({ where: { id } });
  await cacheDel(["master:categories:all", `master:categories:${id}`]);
  return result;
};

// Tags
export const getTags = async () => {
  return await cacheWrap("master:tags:all", CACHE_TTL_MASTER, async () => {
    return await prisma.tagsMaster.findMany({
      orderBy: { name: "asc" },
    });
  });
};

export const getTagById = async (id: string) => {
  return await cacheWrap(`master:tags:${id}`, CACHE_TTL_MASTER, async () => {
    return await prisma.tagsMaster.findUnique({ where: { id } });
  });
};

export const createTag = async (data: { name: string; description?: string; is_active?: boolean }) => {
  const result = await prisma.tagsMaster.create({
    data: {
      ...data,
      is_active: data.is_active ?? true,
      updated_at: new Date(),
    },
  });
  await cacheDel(["master:tags:all"]);
  return result;
};

export const updateTag = async (id: string, data: { name?: string; description?: string; is_active?: boolean }) => {
  const result = await prisma.tagsMaster.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
  await cacheDel(["master:tags:all", `master:tags:${id}`]);
  return result;
};

export const deleteTag = async (id: string) => {
  const result = await prisma.tagsMaster.delete({ where: { id } });
  await cacheDel(["master:tags:all", `master:tags:${id}`]);
  return result;
};

// Roles
export const getRoles = async () => {
  return await cacheWrap("master:roles:all", CACHE_TTL_MASTER, async () => {
    return await prisma.rolesMaster.findMany({
      orderBy: { name: "asc" },
    });
  });
};

export const getRoleById = async (id: string) => {
  return await cacheWrap(`master:roles:${id}`, CACHE_TTL_MASTER, async () => {
    return await prisma.rolesMaster.findUnique({ where: { id } });
  });
};

export const createRole = async (data: { name: string; description?: string; permissions?: any; is_active?: boolean }) => {
  const result = await prisma.rolesMaster.create({
    data: {
      name: data.name,
      description: data.description,
      permissions: data.permissions || {},
      is_active: data.is_active ?? true,
      updated_at: new Date(),
    },
  });
  await cacheDel(["master:roles:all"]);
  return result;
};

export const updateRole = async (id: string, data: { name?: string; description?: string; permissions?: any; is_active?: boolean }) => {
  const result = await prisma.rolesMaster.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
  await cacheDel(["master:roles:all", `master:roles:${id}`]);
  return result;
};

export const deleteRole = async (id: string) => {
  const result = await prisma.rolesMaster.delete({ where: { id } });
  await cacheDel(["master:roles:all", `master:roles:${id}`]);
  return result;
};

// Statuses
export const getStatuses = async (entity_type?: string) => {
  const cacheKey = entity_type ? `master:statuses:${entity_type}` : "master:statuses:all";
  return await cacheWrap(cacheKey, CACHE_TTL_MASTER, async () => {
    const where: any = {};
    if (entity_type) where.entity_type = entity_type;
    return await prisma.statusesMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });
  });
};

export const getStatusById = async (id: string) => {
  return await cacheWrap(`master:statuses:${id}`, CACHE_TTL_MASTER, async () => {
    return await prisma.statusesMaster.findUnique({ where: { id } });
  });
};

export const createStatus = async (data: { name: string; code: string; entity_type?: string; is_active?: boolean }) => {
  const result = await prisma.statusesMaster.create({
    data: {
      ...data,
      is_active: data.is_active ?? true,
      updated_at: new Date(),
    },
  });
  await cacheDel(["master:statuses:all"]);
  return result;
};

export const updateStatus = async (id: string, data: { name?: string; code?: string; entity_type?: string; is_active?: boolean }) => {
  const result = await prisma.statusesMaster.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
  await cacheDel(["master:statuses:all", `master:statuses:${id}`]);
  return result;
};

export const deleteStatus = async (id: string) => {
  const result = await prisma.statusesMaster.delete({ where: { id } });
  await cacheDel(["master:statuses:all", `master:statuses:${id}`]);
  return result;
};
