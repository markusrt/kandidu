import {
  concatTransformationMatrix,
  drawObject,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
} from "@cantoo/pdf-lib";

// Test-only synthetic PDFs (no real documents).

export interface PdfFixtureOptions {
  /** Label drawn on every page so tests can identify page origin. */
  readonly label?: string;
  /** Adds an incompressible image of about this many bytes per page. */
  readonly imageBytesPerPage?: number;
  readonly userPassword?: string;
  readonly ownerPassword?: string;
  /** Page width in points (height stays A4) so tests can tell sources apart. */
  readonly width?: number;
}

function noise(length: number, seed: number): Uint8Array {
  const out = new Uint8Array(length);
  let x = seed || 1;
  for (let i = 0; i < length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = x & 0xff;
  }
  return out;
}

export async function buildFixturePdf(
  pageCount: number,
  options: PdfFixtureOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([options.width ?? 595, 842]);
    page.drawText(`${options.label ?? "Seite"} ${i + 1}`, {
      x: 50,
      y: 780,
      size: 18,
      color: rgb(0, 0, 0),
    });
    if (options.imageBytesPerPage) {
      const side = Math.ceil(Math.sqrt(options.imageBytesPerPage / 3));
      const stream = doc.context.stream(noise(side * side * 3, i + 1), {
        Type: "XObject",
        Subtype: "Image",
        Width: side,
        Height: side,
        ColorSpace: "DeviceRGB",
        BitsPerComponent: 8,
      });
      const ref = doc.context.register(stream);
      const name = page.node.newXObject("Noise", ref);
      page.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(200, 0, 0, 200, 50, 400),
        drawObject(name),
        popGraphicsState(),
      );
    }
  }
  if (options.userPassword !== undefined || options.ownerPassword) {
    doc.encrypt({
      userPassword: options.userPassword ?? "",
      ownerPassword: options.ownerPassword ?? "owner-secret",
      permissions: { printing: "highResolution", copying: false },
    });
  }
  return doc.save({ useObjectStreams: false });
}
