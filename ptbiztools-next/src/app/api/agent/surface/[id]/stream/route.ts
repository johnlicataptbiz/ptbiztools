import { getRun } from "workflow/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const startIndexRaw = searchParams.get("startIndex");
  const startIndex = startIndexRaw ? Number(startIndexRaw) : undefined;

  const run = getRun(id);
  const stream = Number.isFinite(startIndex) ? run.getReadable({ startIndex }) : run.getReadable();

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-workflow-run-id": id,
    },
  });
}
