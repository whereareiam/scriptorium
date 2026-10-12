import { createHash } from 'node:crypto'

/**
 * The id git gives a file's content (`git hash-object`), so translations can name the
 * default-language version they follow with a value git itself can look up.
 */
export function gitBlobHash(content: Buffer) {
  return createHash('sha1').update(`blob ${content.byteLength}\0`).update(content).digest('hex')
}
