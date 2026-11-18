"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type AppSetting = {
  key: string;
  value: unknown;
  updatedAt: string;
};

export async function getSettings(): Promise<AppSetting[]> {
  const rows = await prisma.appSetting.findMany({
    orderBy: { key: "asc" },
  });
  return rows.map((r) => ({
    key: r.key,
    value: r.value,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getSetting(key: string): Promise<unknown | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? row.value : null;
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: value as Prisma.InputJsonValue },
    create: { key, value: value as Prisma.InputJsonValue },
  });
}

export async function deleteSetting(key: string): Promise<void> {
  await prisma.appSetting.delete({ where: { key } });
}
