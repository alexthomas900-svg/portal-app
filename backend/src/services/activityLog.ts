import { db } from '../firebase-admin.js'
import { FieldValue } from 'firebase-admin/firestore'

export async function recordAudit(
  actorUid: string,
  action: string,
  applicationId?: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await db.collection('auditLogs').add({
    actorUid,
    action,
    applicationId: applicationId ?? null,
    details,
    createdAt: FieldValue.serverTimestamp(),
  })
}

export async function createNotification(
  recipientUid: string,
  type: string,
  message: string,
  applicationId?: string,
): Promise<void> {
  await db.collection('users').doc(recipientUid).collection('notifications').add({
    recipientUid,
    type,
    message,
    applicationId: applicationId ?? null,
    createdAt: FieldValue.serverTimestamp(),
    read: false,
  })
}
