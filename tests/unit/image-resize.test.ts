// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { resizeImage } from '../../src/scripts/image-resize.client';

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe('resizeImage', () => {
  it('returns the original for small JPEGs under 3 MB', async () => {
    const small = makeFile('small.jpg', 'image/jpeg', 500_000);
    const out = await resizeImage(small);
    expect(out).toBe(small);
  });

  it('returns the original for HEIC regardless of size', async () => {
    const heic = makeFile('big.heic', 'image/heic', 5_000_000);
    const out = await resizeImage(heic);
    expect(out).toBe(heic);
  });

  it('returns the original when canvas decode fails', async () => {
    // happy-dom does not implement HTMLImageElement loading from blob URLs,
    // so canvas decode will fail and we fall back to original.
    const big = makeFile('big.jpg', 'image/jpeg', 4_000_000);
    const out = await resizeImage(big);
    expect(out).toBe(big);
  });
});
