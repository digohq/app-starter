/**
 * Interface for storage providers
 * Allows switching between different storage backends (local filesystem, R2, S3, etc.)
 */
export interface IStorageProvider {
  /**
   * Upload a file and return its public URL
   * @param file - The file to upload
   * @param folder - The folder/path where the file should be stored
   * @returns Promise resolving to the public URL of the uploaded file
   */
  uploadFile(file: Express.Multer.File, folder: string): Promise<string>;

  /**
   * Delete a file by its URL
   * @param url - The public URL of the file to delete
   * @returns Promise that resolves when the file is deleted
   */
  deleteFile(url: string): Promise<void>;

  /**
   * Get a signed URL for a file
   * @param url - The public URL of the file
   * @param expiresIn - Expiration time in seconds
   * @returns Promise resolving to a signed URL
   */
  getSignedUrl(url: string, expiresIn?: number): Promise<string>;
}
