import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
export function database(path: string, migrations: string) {
  const sql = new DatabaseSync(path);
  sql.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
  sql.exec(
    "CREATE TABLE IF NOT EXISTS _nodeMigrations (name TEXT PRIMARY KEY)",
  );
  for (const name of readdirSync(migrations)
    .filter((s) => s.endsWith(".sql"))
    .sort()) {
    if (sql.prepare("SELECT name FROM _nodeMigrations WHERE name=?").get(name))
      continue;
    sql.exec("BEGIN");
    try {
      sql.exec(readFileSync(migrations + "/" + name, "utf8"));
      sql.prepare("INSERT INTO _nodeMigrations VALUES (?)").run(name);
      sql.exec("COMMIT");
    } catch (e) {
      sql.exec("ROLLBACK");
      throw e;
    }
  }
  const prepare = (query: string) => {
    let params: any[] = [];
    const p = {
      bind(...args: any[]) {
        params = args;
        return p;
      },
      async first() {
        return sql.prepare(query).get(...params) || null;
      },
      async all() {
        return { results: sql.prepare(query).all(...params) };
      },
      runSync() {
        sql.prepare(query).run(...params);
        return { success: true };
      },
      async run() {
        return p.runSync();
      },
    };
    return p;
  };
  return {
    prepare,
    async batch(queries: any[]) {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const q of queries) results.push(q.runSync());
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
