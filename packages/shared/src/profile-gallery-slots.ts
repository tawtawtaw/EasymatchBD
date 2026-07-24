export const MAX_GALLERY_PHOTOS = 4;
export const GALLERY_OTHER_SORT_ORDER = 0;
export const MIN_FAMILY_GALLERY_SORT_ORDER = 1;

export type GallerySlot = 'other' | 'family';

export type GalleryPhotoLike = {
  id: string;
  sortOrder: number;
};

export function splitGalleryPhotos<T extends GalleryPhotoLike>(photos: T[]) {
  const sorted = [...photos].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const otherPhoto =
    sorted.find((photo) => photo.sortOrder === GALLERY_OTHER_SORT_ORDER) ?? null;
  const familyPhotos = sorted.filter(
    (photo) => photo.sortOrder > GALLERY_OTHER_SORT_ORDER,
  );
  return { otherPhoto, familyPhotos };
}

export function isOtherGalleryPhoto(photo: GalleryPhotoLike): boolean {
  return photo.sortOrder === GALLERY_OTHER_SORT_ORDER;
}

export function canAddOtherGalleryPhoto(
  galleryCount: number,
  otherPhoto: GalleryPhotoLike | null,
): boolean {
  return !otherPhoto && galleryCount < MAX_GALLERY_PHOTOS;
}

export function canAddFamilyGalleryPhoto(
  galleryCount: number,
  familyPhotos: GalleryPhotoLike[],
): boolean {
  const maxFamilyPhotos = MAX_GALLERY_PHOTOS - 1;
  return (
    familyPhotos.length < maxFamilyPhotos && galleryCount < MAX_GALLERY_PHOTOS
  );
}

export function resolveGalleryUploadSortOrder(
  slot: GallerySlot,
  existingGallery: GalleryPhotoLike[],
): number {
  const { familyPhotos } = splitGalleryPhotos(existingGallery);

  if (slot === 'other') {
    return GALLERY_OTHER_SORT_ORDER;
  }

  const usedFamilyOrders = new Set(familyPhotos.map((photo) => photo.sortOrder));
  for (
    let order = MIN_FAMILY_GALLERY_SORT_ORDER;
    order < MAX_GALLERY_PHOTOS;
    order += 1
  ) {
    if (!usedFamilyOrders.has(order)) {
      return order;
    }
  }

  throw new Error('No family gallery slot available');
}
