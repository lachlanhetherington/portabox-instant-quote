import { db } from './firebaseService';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

export interface DocumentMetadata {
  id?: string;
  accountId: string;
  name: string;
  driveFileId: string;
  type: string;
  timestamp: number;
  ownerId: string;
}

const DOCUMENTS_COLLECTION = 'documents';

export const uploadDocumentMetadata = async (metadata: DocumentMetadata) => {
  return await addDoc(collection(db, DOCUMENTS_COLLECTION), metadata);
};

export const getDocumentsByAccountId = async (accountId: string) => {
  const q = query(collection(db, DOCUMENTS_COLLECTION), where('accountId', '==', accountId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentMetadata));
};

export const deleteDocument = async (docId: string) => {
  await deleteDoc(doc(db, DOCUMENTS_COLLECTION, docId));
};

export const uploadFileToDrive = async (file: File, accessToken: string) => {
  const metadata = {
    name: file.name,
    mimeType: file.type,
  };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  
  const res = await fetch('/api/drive/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  
  return await res.json();
};
