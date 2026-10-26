import React, { useState, useEffect } from 'react';
import { getDocumentsByAccountId, uploadFileToDrive, uploadDocumentMetadata, DocumentMetadata } from '../services/documentManagementService';
import { getAccessToken } from '../services/firebaseService';

interface Props {
  accountId: string;
  ownerId: string;
}

export const DocumentDashboard: React.FC<Props> = ({ accountId, ownerId }) => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [accountId]);

  const fetchDocuments = async () => {
    setLoading(true);
    const docs = await getDocumentsByAccountId(accountId);
    setDocuments(docs);
    setLoading(false);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const token = await getAccessToken();
    if (!token) {
        alert("Please sign in to upload documents.");
        return;
    }

    setLoading(true);
    try {
      const driveFile = await uploadFileToDrive(file, token);
      await uploadDocumentMetadata({
        accountId,
        name: file.name,
        driveFileId: driveFile.id,
        type: file.type,
        timestamp: Date.now(),
        ownerId,
      });
      fetchDocuments();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold mb-4">Documents</h3>
      <input type="file" onChange={handleUpload} disabled={loading} className="mb-4" />
      {loading && <p>Uploading/Loading...</p>}
      <ul>
        {documents.map(doc => (
          <li key={doc.id} className="py-2 border-b">
            {doc.name} - {new Date(doc.timestamp).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
};
