/**
 * Compresses an image file to reduce its size before upload
 * @param file The image file to compress
 * @param maxWidth Maximum width in pixels (default: 1920)
 * @param maxHeight Maximum height in pixels (default: 1080)
 * @param quality JPEG quality 0-1 (default: 0.8)
 * @returns Promise resolving to a compressed File
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Create new File from blob with original name
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          quality,
        );
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Checks if an image file should be compressed
 * @param file The image file to check
 * @param sizeThreshold Size threshold in bytes (default: 1MB)
 * @returns true if file should be compressed
 */
export function shouldCompressImage(
  file: File,
  sizeThreshold: number = 1024 * 1024, // 1MB
): boolean {
  return file.size > sizeThreshold;
}

const CARD_BACKGROUNDS = {
  activity: ['activity_1.jpg', 'activity_2.jpg', 'activity_3.jpg'],
  meetup: ['meetup_1.jpg', 'meetup_2.jpg', 'meetup_3.jpg'],
  workshop: ['workshop_1.jpg', 'workshop_2.jpg', 'workshop_3.jpg'],
  event: ['event_1.jpg', 'event_2.jpg', 'event_3.jpg'],
};

const ALL_BACKGROUNDS = [
  ...CARD_BACKGROUNDS.activity,
  ...CARD_BACKGROUNDS.meetup,
  ...CARD_BACKGROUNDS.workshop,
  ...CARD_BACKGROUNDS.event,
];

/**
 * Deterministically selects a default cover image based on the event type and ID.
 * Falls back to a random selection from all images if no specific type matches.
 *
 * @param typeTagName The name of the event type tag (e.g., "Workshop", "Meetup")
 * @param seedId A unique identifier (e.g., event ID) to ensure stable selection
 * @returns The absolute path to the selected image in the public folder
 */
export function getDefaultCoverImage(
  typeTagName: string | undefined | null,
  seedId: string,
): string {
  const normalizedType = typeTagName?.toLowerCase() || '';

  let selectedImages: string[] = ALL_BACKGROUNDS;

  if (normalizedType.includes('activity')) {
    selectedImages = CARD_BACKGROUNDS.activity;
  } else if (normalizedType.includes('meetup')) {
    selectedImages = CARD_BACKGROUNDS.meetup;
  } else if (normalizedType.includes('workshop')) {
    selectedImages = CARD_BACKGROUNDS.workshop;
  } else if (normalizedType.includes('event')) {
    selectedImages = CARD_BACKGROUNDS.event;
  }

  // Simple hash function to get a stable index from the seedId
  let hash = 0;
  for (let i = 0; i < seedId.length; i++) {
    hash = (hash << 5) - hash + seedId.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % selectedImages.length;
  const imageName = selectedImages[index];

  return `/images/card-backgrounds/${imageName}`;
}

/** True when the URL is a deterministic stock card background (not session upload or organization default). */
export function isSessionCardPlaceholderBackgroundUrl(url: string): boolean {
  const u = url.trim();
  const prefix = '/images/card-backgrounds/';
  if (u.startsWith(prefix)) return true;
  try {
    return new URL(u, 'https://local.invalid').pathname.startsWith(prefix);
  } catch {
    return false;
  }
}

type SessionCardImageSource = {
  id: string;
  coverImageUrl?: string | null;
  typeTag?: { name: string } | null;
  organization?: { defaultCardImageUrl?: string | null } | null;
  organizations?: { defaultCardImageUrl?: string | null }[];
};

/** Organization default card image from API session payload (primary organization or first organization with a URL). */
export function getOrganizationDefaultCardImageUrlFromSession(
  session:
    | {
        organization?: { defaultCardImageUrl?: string | null } | null;
        organizations?: { defaultCardImageUrl?: string | null }[];
      }
    | null
    | undefined,
): string | null {
  if (!session) return null;
  const direct = session.organization?.defaultCardImageUrl?.trim();
  if (direct) return direct;
  const fromList = session.organizations
    ?.find((g) => g.defaultCardImageUrl?.trim())
    ?.defaultCardImageUrl?.trim();
  return fromList || null;
}

/**
 * Card cover: session image first, then organization default card image, then deterministic placeholder.
 */
export function resolveEffectiveSessionCardCoverUrl(session: SessionCardImageSource): string {
  const direct = session.coverImageUrl?.trim();
  if (direct) return direct;
  const fromOrganization = getOrganizationDefaultCardImageUrlFromSession(session);
  if (fromOrganization) return fromOrganization;
  return getDefaultCoverImage(session.typeTag?.name, session.id);
}
