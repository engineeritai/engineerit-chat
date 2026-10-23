import crypto from "crypto";

type Row = Record<string, unknown>;

/** Just enough of the Supabase client for billing settlement tests. */
export function memSupabase() {
  const tables: Record<string, Row[]> = {};

  function table(name: string) {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  }

  function from(name: string) {
    const state: {
      op: "select" | "insert" | "update" | "upsert";
      filters: Array<(row: Row) => boolean>;
      patch: Row | null;
      inserted: Row[];
    } = { op: "select", filters: [], patch: null, inserted: [] };

    const api = {
      select() {
        return api;
      },
      insert(row: Row | Row[]) {
        const rows = (Array.isArray(row) ? row : [row]).map((item) => ({
          ...item,
          id: item.id || crypto.randomUUID(),
        }));
        table(name).push(...rows);
        state.op = "insert";
        state.inserted = rows;
        return api;
      },
      upsert(row: Row) {
        const stored: Row = { ...row, id: row.id || crypto.randomUUID() };
        const key = stored.moyasar_token ? "moyasar_token" : "id";
        const rows = table(name);
        const index = rows.findIndex((item) => item[key] === stored[key]);
        if (index >= 0) rows[index] = { ...rows[index], ...stored, id: rows[index].id };
        else rows.push(stored);
        state.op = "upsert";
        state.inserted = [index >= 0 ? rows[index] : stored];
        return api;
      },
      update(patch: Row) {
        state.op = "update";
        state.patch = patch;
        return api;
      },
      eq(col: string, val: unknown) {
        state.filters.push((row) => row[col] === val);
        return api;
      },
      in(col: string, vals: unknown[]) {
        state.filters.push((row) => vals.includes(row[col]));
        return api;
      },
      is(col: string, val: unknown) {
        state.filters.push((row) => (val === null ? row[col] == null : row[col] === val));
        return api;
      },
      lt(col: string, val: unknown) {
        state.filters.push((row) => String(row[col] ?? "") < String(val));
        return api;
      },
      gte(col: string, val: unknown) {
        state.filters.push((row) => String(row[col] ?? "") >= String(val));
        return api;
      },
      order() {
        return api;
      },
      limit() {
        return api;
      },
      maybeSingle() {
        return Promise.resolve(one(true));
      },
      single() {
        return Promise.resolve(one(false));
      },
      then(resolve: (value: { data: Row[] | null; error: null }) => unknown, reject?: (err: unknown) => unknown) {
        return Promise.resolve(many()).then(resolve, reject);
      },
    };

    function matched() {
      return table(name).filter((row) => state.filters.every((filter) => filter(row)));
    }

    function many() {
      if (state.op === "update") {
        const rows = matched();
        for (const row of rows) Object.assign(row, state.patch);
        return { data: rows.map((row) => ({ ...row })), error: null };
      }
      if (state.op === "insert" || state.op === "upsert") {
        return { data: state.inserted.map((row) => ({ ...row })), error: null };
      }
      return { data: matched().map((row) => ({ ...row })), error: null };
    }

    function one(allowEmpty: boolean) {
      const result = many();
      const row = result.data?.[0] ?? null;
      if (!allowEmpty && !row) return { data: null, error: { message: "not found" } };
      return { data: row, error: null };
    }

    return api;
  }

  return { from, tables };
}
