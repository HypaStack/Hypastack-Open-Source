import JSZip from "jszip"
import type { FileWithPreview } from "./types"

// Zips the selected files (preserving folder paths) into one archive. A lone
// file with no folder path is returned as-is so we never wastefully re-zip it.
export async function createZipArchive(
  files: FileWithPreview[],
  archiveName: string | null | undefined,
  onProgress: (percent: number) => void
): Promise<File> {
  const singleFileNoFolders = files.length === 1 && !files[0].path?.includes("/")
  if (singleFileNoFolders) return files[0].file

  const zip = new JSZip()
  files.forEach((fileWithId) => {
    const path = fileWithId.path || fileWithId.file.name
    zip.file(path, fileWithId.file)
  })

  const content = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE" },
    (metadata) => onProgress(Math.round(metadata.percent))
  )

  const safeName = archiveName?.trim()
    ? archiveName.trim().replace(/\.zip$/i, "") + ".zip"
    : "hypastack-archive.zip"

  return new File([content], safeName, { type: "application/zip" })
}
