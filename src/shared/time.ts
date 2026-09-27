/** Clock time for chat rows, e.g. `3:42 PM`. */
export function formatChatTime(sentAt: number, now = Date.now()): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay =
    date.getFullYear() === new Date(now).getFullYear() &&
    date.getMonth() === new Date(now).getMonth() &&
    date.getDate() === new Date(now).getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
