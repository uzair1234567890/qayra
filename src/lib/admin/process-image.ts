import sharp from 'sharp';

/**
 * Process an uploaded image buffer:
 *   - rotate() applies EXIF orientation and strips it
 *   - resize to max 1600px wide (no upscaling)
 *   - encode as WebP @ quality 82
 */
export async function processImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
