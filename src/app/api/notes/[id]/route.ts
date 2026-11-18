import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { updateNoteSchema } from "@/lib/validation/note";
import { deleteNote, getNote, updateNote } from "@/server/notes";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const note = await getNote(id);
    return Response.json({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const input = updateNoteSchema.parse(await request.json());
    const note = await updateNote(id, input);
    return Response.json({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteNote(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
