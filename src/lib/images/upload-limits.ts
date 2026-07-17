export const maxProductImageFileSize = 12 * 1024 * 1024;
export const maxProductImageBatchSize = 48 * 1024 * 1024;

export function validateProductImageBatch(files: ArrayLike<Pick<File, "size">>) {
  let totalSize = 0;

  for (const file of Array.from(files)) {
    if (file.size <= 0 || file.size > maxProductImageFileSize) {
      throw new Error("Fotografie může mít nejvýše 12 MB.");
    }
    totalSize += file.size;
  }

  if (totalSize > maxProductImageBatchSize) {
    throw new Error("Jedna dávka fotografií může mít nejvýše 48 MB. Nahrajte fotografie ve více dávkách.");
  }
}
