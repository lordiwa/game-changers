/**
 * Minimal ambient declaration for `archiver` (no @types/archiver to avoid pulling
 * @types/node@25 which breaks pnpm + vitest resolution on Windows).
 *
 * Provides only the surface used by dsarExport.ts.
 */
declare module 'archiver' {
  interface ArchiverOptions {
    zlib?: { level?: number };
  }
  interface Archiver {
    pipe(dest: NodeJS.WritableStream): NodeJS.WritableStream;
    append(source: string | NodeJS.ReadableStream, data: { name: string }): this;
    finalize(): Promise<void>;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }
  function archiver(format: 'zip', options?: ArchiverOptions): Archiver;
  export default archiver;
}
