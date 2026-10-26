# Digital Document Management Module

This module will allow admins and customers to upload, manage, and view documents (like contracts, ID proof, or site photos) directly within the application, utilizing Google Drive for file storage and Firebase Firestore for document metadata management.

## 1. Core Concept
- Admins/Customers can upload files associated with a customer account or container order.
- Files are stored in a dedicated Google Drive folder (structured by account).
- Document metadata (file ID, URL, type, timestamp, owner) is stored in Firebase Firestore for quick retrieval.
- Integrated file picker and preview capabilities.

## 2. Key Features
- **File Upload/Link**: Use Google Picker API for selecting existing files from Drive, or local file upload which triggers a copy to Drive.
- **Document List/Dashboard**: A new view in the Admin Portal and Customer Portal to see all associated documents (contracts, photos, etc.).
- **Categorization**: Tag documents by type (e.g., Contract, ID, Photo).
- **Access Control**: Ensure documents are accessible based on user roles (Admin vs. Customer).

## 3. Technical Architecture
- **Storage**: Google Drive (integration via Workspace API).
- **Metadata Database**: Firebase Firestore (already provisioned).
- **Frontend**: Google Picker API for UI, React components for the document dashboard.
- **OAuth**: Require `https://www.googleapis.com/auth/drive.file` scope.

## 4. Proposed Implementation Steps
1. **OAuth Setup**: Configure Workspace OAuth with Drive scopes.
2. **Firestore Schema**: Update `firebase-blueprint.json` to include a `documents` collection.
3. **Backend/Service Layer**: Implement service to handle file metadata storage and Drive API calls.
4. **UI Implementation**:
   - `DocumentUploader`: Component with file picker/uploader.
   - `DocumentDashboard`: List and manage documents.
5. **Security**: Implement Firestore rules to protect document records.
6. **Testing**: Upload/delete/verify files.

---

### Clarification Questions
To ensure this aligns with your expectations, please answer the following:

1. **Storage preference**: Would you like files to be stored in the *user's personal* Google Drive (connected via their account) or in a *shared* Portabox Google Drive?
2. **Categorization**: Are there specific document types you need to support immediately (e.g., contracts, driver's license, photos)?
3. **Roles**: Should customers be able to see *all* documents on their account, or only specific ones you choose to share?
