import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

/** Consistent JSON error shape for every route handler. */
export function apiError(message: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}

/** Throw from the server layer when a record is missing; routes map it to 404. */
export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof NotFoundError) {
    return apiError(error.message, 404);
  }

  if (error instanceof ZodError) {
    return apiError("Invalid input", 400, { issues: error.issues });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025":
        return apiError("Not found", 404);
      case "P2002":
        return apiError("That record already exists", 409);
      case "P2003":
        return apiError("A related record does not exist", 400);
      default:
        console.error("Prisma error", error.code, error.message);
        return apiError("Database error", 500);
    }
  }

  console.error("Unhandled API error", error);
  return apiError("Something went wrong", 500);
}
