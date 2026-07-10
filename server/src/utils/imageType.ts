const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface DetectedImageType {
  ext: string;
  mime: string;
}

interface ImageSignature extends DetectedImageType {
  matches: (buffer: Buffer) => boolean;
}

const SIGNATURES: ImageSignature[] = [
  {
    ext: 'png',
    mime: 'image/png',
    matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE),
  },
  {
    ext: 'jpg',
    mime: 'image/jpeg',
    matches: (buffer) =>
      buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

// Identifies the real image type from file content (magic bytes), independent
// of the client-declared MIME type or original filename.
export const detectImageType = (buffer: Buffer): DetectedImageType | null => {
  const signature = SIGNATURES.find((s) => s.matches(buffer));
  return signature ? { ext: signature.ext, mime: signature.mime } : null;
};
