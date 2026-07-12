/** 경로를 디렉토리(흐리게 표시)와 파일명(강조)으로 나눈다 */
export function splitPath(path: string): { dir: string; name: string } {
  const idx = path.lastIndexOf("/");
  if (idx < 0) return { dir: "", name: path };
  return { dir: path.slice(0, idx + 1), name: path.slice(idx + 1) };
}

/** 절대 경로를 `…/부모/이름` 수준으로 줄인다 */
export function shortenPath(path: string): { prefix: string; base: string } {
  const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
  const base = parts.pop() ?? path;
  const parent = parts.pop();
  return { prefix: parent ? `…/${parent}/` : "", base };
}

/** ISO 날짜를 오늘/어제/n일 전/로컬 날짜로 표시한다 */
export function relativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const startOfDay = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString();
}
