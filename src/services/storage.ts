import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import type { DocumentFile } from '../types'
import { recordDocumentUpload } from './workflows'

// The hosted demo runs without Firebase Storage, which needs a paid plan.
// Uploads there keep the file's name and timestamp but not its contents.
export const fileStorageDisabled = import.meta.env.VITE_DISABLE_FILE_STORAGE === 'true'
const SAMPLE_DOCUMENT_URL = '/sample-document.pdf'

export async function uploadDocument(
  applicationId: string,
  category: string,
  file: File,
): Promise<DocumentFile> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `applications/${applicationId}/${category}/${Date.now()}_${sanitizedName}`
  if (fileStorageDisabled) {
    await recordDocumentUpload(applicationId, category, file.name)
    return { name: file.name, url: SAMPLE_DOCUMENT_URL, path, uploadedAt: new Date().toISOString() }
  }
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  await recordDocumentUpload(applicationId, category, file.name)
  return {
    name: file.name,
    url,
    path,
    uploadedAt: new Date().toISOString(),
  }
}
