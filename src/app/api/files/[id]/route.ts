import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { updateFileSchema } from "@/lib/validation/file";
import { deleteFile, getFile, updateFile } from "@/server/files";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const file = await getFile(id);
    return Response.json({ file });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const input = updateFileSchema.parse(await request.json());
    const file = await updateFile(id, input);
    return Response.json({ file });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteFile(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
