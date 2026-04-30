export function toRefSlug(refName: string) {
  return refName.replace(/[^A-Za-z0-9._-]+/g, "~");
}
