import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { createFileSchema, fileQuerySchema } from "@/lib/validation/file";
import { createFile, listFiles } from "@/server/files";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const query = fileQuerySchema.parse(Object.fromEntries(searchParams));
    const files = await listFiles(query);
    return Response.json({ files });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createFileSchema.parse(await request.json());
    const file = await createFile(input);
    return Response.json({ file }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
