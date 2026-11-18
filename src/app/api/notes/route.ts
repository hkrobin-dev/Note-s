import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { createNoteSchema, noteQuerySchema } from "@/lib/validation/note";
import { createNote, listNotes } from "@/server/notes";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const query = noteQuerySchema.parse(Object.fromEntries(searchParams));
    const notes = await listNotes(query);
    return Response.json({ notes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createNoteSchema.parse(await request.json());
    const note = await createNote(input);
    return Response.json({ note }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
