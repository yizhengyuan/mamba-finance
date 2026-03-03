function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function generateOrderNo(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = pad2(now.getUTCMonth() + 1);
  const day = pad2(now.getUTCDate());
  const hour = pad2(now.getUTCHours());
  const minute = pad2(now.getUTCMinutes());
  const second = pad2(now.getUTCSeconds());
  const rand = Math.floor(Math.random() * 9000 + 1000);

  return `ORD-${year}${month}${day}-${hour}${minute}${second}-${rand}`;
}
