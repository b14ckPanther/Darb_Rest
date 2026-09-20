import "server-only";
import { TABLE_TOKEN_PATTERN, type PublicTableContext } from "@darb-rest/types";
import { guestDb } from "./guest-orders";
export async function resolveTableToken(token: string): Promise<PublicTableContext | null> {
  if (!TABLE_TOKEN_PATTERN.test(token)) return null;
  const { data, error } = await guestDb().rpc("resolve_table_qr", { p_token: token });
  if (error) throw error;
  return data as unknown as PublicTableContext | null;
}
