import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { createProjectSchema, projectQuerySchema } from "@/lib/validation/project";
import { createProject, listProjects } from "@/server/projects";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  try {
    const query = projectQuerySchema.parse(Object.fromEntries(searchParams));
    const projects = await listProjects(query);
    return Response.json({ projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = createProjectSchema.parse(await request.json());
    const project = await createProject(input);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
