export const MAX_GALLERY_PHOTOS = 4;
export const GALLERY_FAMILY_SORT_ORDER = 0;
export const MIN_OTHER_GALLERY_SORT_ORDER = 1;
export const MAX_OTHER_GALLERY_PHOTOS = MAX_GALLERY_PHOTOS - 1;

/** @deprecated Family now uses sort order 0; kept for older officer UI checks. */
export const GALLERY_OTHER_SORT_ORDER = MIN_OTHER_GALLERY_SORT_ORDER;
export const MIN_FAMILY_GALLERY_SORT_ORDER = GALLERY_FAMILY_SORT_ORDER;

export type GallerySlot = 'other' | 'family';

export type GalleryPhotoLike = {
  id: string;
  sortOrder: number;
  createdAt?: string | Date;
};

function compareGalleryPhotos(a: GalleryPhotoLike, b: GalleryPhotoLike) {
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
}

export function splitGalleryPhotos<T extends GalleryPhotoLike>(photos: T[]) {
  const sorted = [...photos].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  // Numbered extra photos (1, 2, 3) mean slot 0 is the real family photo.
  // If every gallery photo is still on 0, they are leftover extras — show them
  // all under "your other photos" instead of hiding all but one as family.
  const hasNumberedOthers = sorted.some(
    (photo) => photo.sortOrder >= MIN_OTHER_GALLERY_SORT_ORDER,
  );
  const zeros = sorted.filter(
    (photo) => photo.sortOrder === GALLERY_FAMILY_SORT_ORDER,
  );
  const familyPhoto =
    hasNumberedOthers && zeros.length > 0 ? zeros[0] : null;
  const otherPhotos = familyPhoto
    ? sorted.filter((photo) => photo.id !== familyPhoto.id)
    : sorted;
  return { otherPhotos, familyPhoto };
}

export function isOtherGalleryPhoto(photo: GalleryPhotoLike): boolean {
  return photo.sortOrder !== GALLERY_FAMILY_SORT_ORDER;
}

export function canAddOtherGalleryPhoto(
  galleryCount: number,
  otherPhotos: GalleryPhotoLike[],
): boolean {
  return (
    otherPhotos.length < MAX_OTHER_GALLERY_PHOTOS &&
    galleryCount < MAX_GALLERY_PHOTOS
  );
}

export function remainingGallerySlots(galleryCount: number): number {
  return Math.max(0, MAX_GALLERY_PHOTOS - galleryCount);
}

export function canAddFamilyGalleryPhoto(
  galleryCount: number,
  familyPhoto: GalleryPhotoLike | null,
): boolean {
  return !familyPhoto && galleryCount < MAX_GALLERY_PHOTOS;
}

/** Compact extra photos onto sort orders 1, 2, 3 in upload order. Family stays at 0. */
export function planOtherGallerySortOrders<T extends GalleryPhotoLike>(
  existingGallery: T[],
): Array<{ id: string; sortOrder: number }> {
  const { otherPhotos } = splitGalleryPhotos(existingGallery);
  return [...otherPhotos]
    .sort(compareGalleryPhotos)
    .slice(0, MAX_OTHER_GALLERY_PHOTOS)
    .map((photo, index) => ({
      id: photo.id,
      sortOrder: MIN_OTHER_GALLERY_SORT_ORDER + index,
    }));
}

export function resolveGalleryUploadSortOrder(
  slot: GallerySlot,
  existingGallery: GalleryPhotoLike[],
): number {
  if (slot === 'family') {
    return GALLERY_FAMILY_SORT_ORDER;
  }

  const planned = planOtherGallerySortOrders(existingGallery);
  const used = new Set(planned.map((photo) => photo.sortOrder));
  for (
    let order = MIN_OTHER_GALLERY_SORT_ORDER;
    order <= MAX_OTHER_GALLERY_PHOTOS;
    order += 1
  ) {
    if (!used.has(order)) {
      return order;
    }
  }

  throw new Error('No other-photo gallery slot available');
}
