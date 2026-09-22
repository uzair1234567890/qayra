const MAX_WIDTH = 2000;
const SKIP_RESIZE_BYTES = 3 * 1024 * 1024;
const HEIC_TYPES = /^image\/(heic|heif)$/;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error('decode_failed');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function resizeImage(file: File): Promise<File> {
  if (HEIC_TYPES.test(file.type)) return file;
  if (file.size <= SKIP_RESIZE_BYTES) {
    // Still need to check width for very tall thin images; do a quick probe.
    try {
      const img = await loadImage(file);
      if (img.width <= MAX_WIDTH) return file;
    } catch {
      return file;
    }
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  const ratio = Math.min(1, MAX_WIDTH / img.width);
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  if (!blob) return file;

  const stem = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${stem}-resized.jpg`, { type: 'image/jpeg' });
}
