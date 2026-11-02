/**
 * Health-check endpoint for InternHub.
 *
 * InternHub currently uses Firebase and browser localStorage; this endpoint
 * must not initialize the unused PostgreSQL/Drizzle starter database.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "InternHub",
    timestamp: new Date().toISOString(),
  });
}
