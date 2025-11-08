import tusky from "@/utils/tusky";

const VAULT_ID = import.meta.env.VITE_POPCHAIN_VAULT_ID;

/**
 * Uploads a file to Tusky and returns the upload ID.
 * The upload ID should be stored in the database for later retrieval of metadata.
 * @param file The file to upload.
 * @returns The upload ID for the uploaded file.
 */
export const uploadImageToTusky = async (file: File): Promise<string> => {
  if (!VAULT_ID) {
    throw Error("Missing VAULT_ID");
  }

  const uploadId = await tusky.file.upload(VAULT_ID, file, {
    parentId: "761fbdd4-4659-461a-86db-af875f33981c",
  });

  return uploadId;
};

/**
 * Gets image metadata by upload ID with retries.
 * Since metadata may not be instantly available after upload, this function
 * attempts multiple times with delays using Promise.allSettled.
 * @param uploadId The upload ID from Tusky.
 * @returns The image metadata, or null if metadata is still not available after retries.
 */
export const getImageByUploadId = async (
  uploadId: string
): Promise<Awaited<ReturnType<typeof tusky.file.get>> | null> => {
  // Retry metadata fetch since it may not be instantly available
  // Try multiple times in parallel with delays
  const delays = [0, 500, 1000, 2000];
  const metadataAttempts = await Promise.allSettled(
    delays.map((delay) =>
      delay === 0
        ? tusky.file.get(uploadId)
        : new Promise<Awaited<ReturnType<typeof tusky.file.get>>>(
            (resolve, reject) =>
              setTimeout(
                () => tusky.file.get(uploadId).then(resolve).catch(reject),
                delay
              )
          )
    )
  );

  // Find the first successful metadata fetch
  const successfulAttempt = metadataAttempts.find(
    (
      result
    ): result is PromiseFulfilledResult<
      Awaited<ReturnType<typeof tusky.file.get>>
    > => result.status === "fulfilled"
  );

  // Return metadata if found, otherwise return null to indicate it's not available yet
  return successfulAttempt ? successfulAttempt.value : null;
};

/**
 * Gets the public URL for a file from blobId or image metadata.
 * @param blobIdOrMetadata Either a blobId string (for backward compatibility) or image metadata object.
 * @returns The public URL of the file, or null if blobId is not available in metadata.
 */
export const getFilePublicUrl = (
  blobIdOrMetadata: string | { blobId?: string } | null | undefined
): string | null => {
  // Handle string blobId (backward compatibility)
  if (typeof blobIdOrMetadata === "string") {
    return `https://walrus.tusky.io/${blobIdOrMetadata}`;
  }

  // Handle metadata object
  if (!blobIdOrMetadata?.blobId) {
    return null;
  }
  return `https://walrus.tusky.io/${blobIdOrMetadata.blobId}`;
};

/**
 * Gets the public URL for an image by its upload ID.
 * This is a convenience function that combines getImageByUploadId and getFilePublicUrl.
 * @param uploadId The upload ID from Tusky.
 * @returns The public URL of the file, or null if metadata is still not available.
 *          When null is returned, the image exists but metadata is not yet available.
 */
export const getImagePublicUrlByUploadId = async (
  uploadId: string
): Promise<string | null> => {
  const imageMetadata = await getImageByUploadId(uploadId);
  return getFilePublicUrl(imageMetadata);
};
