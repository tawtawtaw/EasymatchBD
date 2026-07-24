import { listMyConnections } from "../services/discovery";

const privacyLevelByConnection = new Map<string, number>();

export async function getConnectionPrivacyLevel(connectionId: string): Promise<number> {
  const cached = privacyLevelByConnection.get(connectionId);
  if (cached !== undefined) {
    return cached;
  }

  const connections = await listMyConnections();
  for (const connection of connections) {
    privacyLevelByConnection.set(connection.connectionId, connection.privacyLevel);
  }

  return privacyLevelByConnection.get(connectionId) ?? 1;
}

export function setConnectionPrivacyLevel(connectionId: string, privacyLevel: number) {
  privacyLevelByConnection.set(connectionId, privacyLevel);
}

export function clearConnectionPrivacyCache() {
  privacyLevelByConnection.clear();
}
