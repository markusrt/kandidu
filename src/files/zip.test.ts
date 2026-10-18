import { describe, expect, it } from "vitest";
import { FileError } from "./errors";
import { unzipFiles, zipFiles } from "./zip";

const enc = new TextEncoder();

describe("zip", () => {
  it("round-trips compressed and stored entries", () => {
    const a = enc.encode("hello hello hello hello hello");
    const b = new Uint8Array([1, 2, 3, 4, 5]);
    const out = unzipFiles(
      zipFiles([
        { name: "a.txt", bytes: a, compress: true },
        { name: "b.bin", bytes: b, compress: false },
      ]),
    );
    expect([...out.keys()]).toEqual(["a.txt", "b.bin"]);
    expect(out.get("a.txt")).toEqual(a);
    expect(out.get("b.bin")).toEqual(b);
  });

  it("preserves UTF-8 names with umlauts", () => {
    const bytes = enc.encode("x");
    const out = unzipFiles(
      zipFiles([{ name: "Zeugnisse_Müller.pdf", bytes, compress: false }]),
    );
    expect(out.get("Zeugnisse_Müller.pdf")).toEqual(bytes);
  });

  it("throws zip-failed on corrupt input", () => {
    let error: unknown;
    try {
      unzipFiles(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(FileError);
    expect((error as FileError).code).toBe("zip-failed");
  });
});
