// 浏览器端图片压缩：把上传前的图片缩放到最长边 MAX_DIMENSION 并转成 JPEG，
// 既减小图床体积，也避免超大原图撑爆 R2。SVG / GIF（会丢失动画）和已经很小的
// 图片直接原样返回，不做处理。

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const SKIP_BELOW_BYTES = 300 * 1024;

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  if (file.size <= SKIP_BELOW_BYTES) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / bitmap.width, MAX_DIMENSION / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close?.();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);

    if (!blob) {
      return file;
    }

    const base = file.name.replace(/\.[^.]+$/, "");
    const name = `${base}.jpg`;

    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}
