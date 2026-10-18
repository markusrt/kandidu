import { unzipSync, type Zippable, zipSync } from "fflate";
import { FileError } from "./errors";

export interface ZipEntry {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly compress: boolean;
}

/** Zips entries in order. Duplicate names are the caller's responsibility. */
export function zipFiles(entries: readonly ZipEntry[]): Uint8Array {
  try {
    const zippable: Zippable = {};
    for (const entry of entries) {
      zippable[entry.name] = [entry.bytes, { level: entry.compress ? 6 : 0 }];
    }
    return zipSync(zippable);
  } catch {
    throw new FileError("zip-failed");
  }
}

export function unzipFiles(bytes: Uint8Array): Map<string, Uint8Array> {
  try {
    return new Map(Object.entries(unzipSync(bytes)));
  } catch {
    throw new FileError("zip-failed");
  }
}
