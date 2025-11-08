import tusky from "@/utils/tusky";

const VAULT_ID = import.meta.env.VITE_POPCHAIN_VAULT_ID

/**
 * Uploads a file to Tusky and returns the full public URL.
 * @param file The file to upload.
 * @returns The public URL of the uploaded file.
 */
export const uploadImageToTusky = async (file: File) => {
    if(!VAULT_ID) {
        throw Error("Missing VAULT_ID");
    }



    const uploadId = await tusky.file.upload(VAULT_ID, file, {parentId: "761fbdd4-4659-461a-86db-af875f33981c"});
    const metadata = await tusky.file.get(uploadId);

   
    
    if (!metadata?.blobId) {
        throw new Error("Failed to get blobId from Tusky upload.")
    }

    return getFilePublicUrl(metadata.blobId);
}

/**
 * Gets the public URL for a file from its blobId.
 * @param blobId The blobId of the file in Tusky.
 * @returns The public URL of the file.
 */
export const getFilePublicUrl = (blobId: string) => {
    return `https://walrus.tusky.io/${blobId}`;
}

/**
 * Deletes a file from Tusky by its blobId.
 * @param blobId The blobId of the file to delete.
 */
export const deleteImageFromTusky = async (blobId: string) => {
    if(!VAULT_ID) {
        throw Error("Missing VAULT_ID");
    }

    try {
        await tusky.file.delete(VAULT_ID, blobId);
    } catch (error) {
        console.error(`Failed to delete image with blobId ${blobId} from Tusky:`, error);
    }
}
