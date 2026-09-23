/** Guest-chat thread merge: server rows + local guest/bot rows, oldest → newest. */

export type GuestThreadMsg = {
  _id: string;
  content?: string;
  sentAt?: string | Date;
  isBot?: boolean;
  senderUserId?: unknown;
  [key: string]: unknown;
};

const timeOf = (m: GuestThreadMsg) => {
  const t = new Date(m.sentAt as string).getTime();
  return Number.isFinite(t) ? t : 0;
};

const isGuestUser = (m: GuestThreadMsg) => !m.senderUserId && !m.isBot;

export function mergeGuestThread(serverItems: GuestThreadMsg[] = [], localMsgs: GuestThreadMsg[] = []) {
  const server = Array.isArray(serverItems) ? serverItems : [];
  const localIds = new Set(localMsgs.map((m) => String(m._id)));
  const consumedServerIds = new Set<string>();

  // Local guest rows keep the session's chronological sequence. Each one consumes
  // one matching server echo (by id, or by content if the local id is still pending)
  // so a later poll cannot reorder the user bubble above its bot reply.
  for (const local of localMsgs) {
    if (!isGuestUser(local)) continue;
    const byId = server.find((s) => String(s._id) === String(local._id));
    if (byId) {
      consumedServerIds.add(String(byId._id));
      continue;
    }
    const echo = server.find(
      (s) => isGuestUser(s) && s.content === local.content && !consumedServerIds.has(String(s._id)) && !localIds.has(String(s._id)),
    );
    if (echo) consumedServerIds.add(String(echo._id));
  }

  const merged = [
    ...server.filter((s) => !consumedServerIds.has(String(s._id)) && !localIds.has(String(s._id))),
    ...localMsgs,
  ];

  merged.sort((a, b) => {
    const dt = timeOf(a) - timeOf(b);
    if (dt !== 0) return dt;
    if (isGuestUser(a) !== isGuestUser(b)) return isGuestUser(a) ? -1 : 1;
    return String(a._id).localeCompare(String(b._id));
  });

  return merged;
}
