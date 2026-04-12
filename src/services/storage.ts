import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import type { DocumentFile } from '../types'
import { Timestamp } from 'firebase/firestore'

export async function uploadDocument(
  applicationId: string,
  category: string,
  file: File,
): Promise<DocumentFile> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `applications/${applicationId}/${category}/${Date.now()}_${sanitizedName}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return {
    name: file.name,
    url,
    path,
    uploadedAt: Timestamp.now(),
  }
}
