/** "1 category", "5 categories". */
export function countOf(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
