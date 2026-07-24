import type { Area } from "react-easy-crop";

export const PHOTO_CROP_MAX_DIMENSION = 1200;
export const PRIMARY_PHOTO_ASPECT = 3 / 4;
export const GALLERY_PHOTO_ASPECT = 1;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Failed to load image")));
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export cropped image"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function scaledCropSize(width: number, height: number) {
  const longest = Math.max(width, height);
  if (longest <= PHOTO_CROP_MAX_DIMENSION) {
    return { width, height };
  }
  const scale = PHOTO_CROP_MAX_DIMENSION / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export async function getCroppedPhotoFile(
  imageSrc: string,
  pixelCrop: Area,
  originalName: string,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const { width, height } = scaledCropSize(pixelCrop.width, pixelCrop.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to prepare crop canvas");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height,
  );

  const mimeType = "image/jpeg";
  const blob = await canvasToBlob(canvas, mimeType, 0.92);
  const baseName = originalName.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: mimeType, lastModified: Date.now() });
}

export function readFileAsObjectUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}
