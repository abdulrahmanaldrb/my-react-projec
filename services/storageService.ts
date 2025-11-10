// services/storageService.ts
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload a profile photo to Firebase Storage under uploads/images/{uid}/
 * Returns the public download URL to store in user profile (photoURL)
 */
export const uploadProfilePhoto = async (file: File, uid: string): Promise<string> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `uploads/images/${uid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(snapshot.ref);
  return url;
};
