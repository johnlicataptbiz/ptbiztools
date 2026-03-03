import type { LocalAction } from "./types";

let dbPromise: Promise<import("@electric-sql/pglite").PGlite> | null = null;

async function getDb() {
  if (typeof window === "undefined") {
    throw new Error("PGlite can only run in the browser runtime");
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const { PGlite } = await import("@electric-sql/pglite");
      const db = new PGlite("idb://ptbiztools-next");
      await db.query(`
        create table if not exists local_actions (
          id text primary key,
          action_type text not null,
          description text not null,
          created_at text not null,
          user_name text,
          user_image_url text,
          source text not null,
          synced_at text not null
        );
      `);
      return db;
    })();
  }

  return dbPromise;
}

export async function readLocalActions(limit = 30): Promise<LocalAction[]> {
  const db = await getDb();
  const result = await db.query<{
    id: string;
    action_type: string;
    description: string;
    created_at: string;
    user_name: string | null;
    user_image_url: string | null;
    source: "remote" | "local";
  }>(
    `select id, action_type, description, created_at, user_name, user_image_url, source
     from local_actions
     order by created_at desc
     limit $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    actionType: row.action_type,
    description: row.description,
    createdAt: row.created_at,
    userName: row.user_name,
    userImageUrl: row.user_image_url,
    source: row.source,
  }));
}

export async function upsertLocalActions(actions: LocalAction[]): Promise<number> {
  if (actions.length === 0) return 0;
  const db = await getDb();
  const syncedAt = new Date().toISOString();

  for (const action of actions) {
    await db.query(
      `insert into local_actions (
          id, action_type, description, created_at, user_name, user_image_url, source, synced_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
          action_type = excluded.action_type,
          description = excluded.description,
          created_at = excluded.created_at,
          user_name = excluded.user_name,
          user_image_url = excluded.user_image_url,
          source = excluded.source,
          synced_at = excluded.synced_at`,
      [
        action.id,
        action.actionType,
        action.description,
        action.createdAt,
        action.userName,
        action.userImageUrl,
        action.source,
        syncedAt,
      ],
    );
  }

  return actions.length;
}

export async function addLocalAction(action: Omit<LocalAction, "source">): Promise<void> {
  const db = await getDb();
  await db.query(
    `insert into local_actions (
      id, action_type, description, created_at, user_name, user_image_url, source, synced_at
    ) values ($1, $2, $3, $4, $5, $6, 'local', $7)
    on conflict (id) do nothing`,
    [
      action.id,
      action.actionType,
      action.description,
      action.createdAt,
      action.userName,
      action.userImageUrl,
      new Date().toISOString(),
    ],
  );
}
