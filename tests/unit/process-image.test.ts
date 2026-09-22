import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { processImage } from '../../src/lib/admin/process-image';

describe('processImage', () => {
  it('outputs WebP', async () => {
    const input = await readFile(resolve('tests/fixtures/test-image.png'));
    const out = await processImage(input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
  });

  it('does not upscale a small image', async () => {
    const input = await readFile(resolve('tests/fixtures/test-image.png'));
    const out = await processImage(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(16);
  });

  it('resizes a large image to 1600px max width', async () => {
    const big = await sharp({
      create: { width: 4000, height: 4000, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const out = await processImage(big);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1600);
    expect(meta.format).toBe('webp');
  });

  it('rejects a non-image buffer', async () => {
    await expect(processImage(Buffer.from('not an image'))).rejects.toThrow(/unsupported image format|input buffer contains unsupported/i);
  });
});
