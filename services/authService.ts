// services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User,
  UserCredential,
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { createUserProfile, deleteAllUserData, checkUserStatusByEmail } from "./firebaseService";

export interface AuthResponse {
    success: boolean;
    message?: string;
}

const getFirebaseErrorMessage = (error: any): string => {
    if (error.code) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-disabled':
                return 'This user account has been disabled.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters long.';
            case 'auth/requires-recent-login':
                return 'This action requires a recent login. Please log out and log in again.';
            default:
                return 'An unexpected authentication error occurred.';
        }
    }
    return 'An unknown error occurred.';
};

// Sign in with Google provider
export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result.user && result.user.email) {
      const displayName = result.user.displayName || undefined;
      const photoURL = result.user.photoURL || undefined;
      let firstName: string | undefined;
      let lastName: string | undefined;
      if (displayName) {
        const parts = displayName.trim().split(/\s+/);
        firstName = parts[0];
        lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
      }
      await createUserProfile(result.user.uid, result.user.email, { displayName, photoURL, firstName, lastName });
    }
    return { success: true };
  } catch (error) {
    console.error('Google sign-in failed:', error);
    return { success: false, message: getFirebaseErrorMessage(error) };
  }
};

// Send password reset email to the provided address.
export const requestPasswordResetEmail = async (email: string): Promise<AuthResponse> => {
  try {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent. Please check your inbox.' };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, message: getFirebaseErrorMessage(error) };
  }
};

export const signUp = async (email: string, pass: string): Promise<AuthResponse> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, pass);
    if (userCredential.user && userCredential.user.email) {
        await createUserProfile(userCredential.user.uid, userCredential.user.email);
    }
    return { success: true };
  } catch (error) {
    console.error("Error signing up:", error);
    return { success: false, message: getFirebaseErrorMessage(error) };
  }
};

export const signIn = async (email: string, pass: string): Promise<AuthResponse> => {
  try {
    // First, check the user's status from Firestore before attempting to sign in.
    const userStatus = await checkUserStatusByEmail(email);
    if (userStatus?.status === 'suspended') {
        return { success: false, message: "This account has been temporarily suspended." };
    }
    if (userStatus?.status === 'banned') {
        return { success: false, message: "This account has been permanently banned." };
    }

    await signInWithEmailAndPassword(auth, email, pass);
    return { success: true };
  } catch (error) {
    console.error("Error signing in:", error);
    return { success: false, message: getFirebaseErrorMessage(error) };
  }
};

export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const changeUserPassword = async (oldPassword: string, newPassword: string): Promise<AuthResponse> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
        return { success: false, message: "No user is currently signed in." };
    }
    
    try {
        const credential = EmailAuthProvider.credential(user.email, oldPassword);
        // Re-authenticate the user to confirm their identity
        await reauthenticateWithCredential(user, credential);
        // If re-authentication is successful, update the password
        await updatePassword(user, newPassword);
        return { success: true };
    } catch (error) {
        console.error("Error changing password:", error);
        return { success: false, message: getFirebaseErrorMessage(error) };
    }
};


export const deleteUserAccount = async (): Promise<AuthResponse> => {
    const user = auth.currentUser;
    if (!user) {
        return { success: false, message: "No user is currently signed in." };
    }

    try {
        // First, delete all associated Firestore data
        await deleteAllUserData(user.uid);
    } catch (error) {
        console.error("Error deleting user's Firestore data:", error);
        return { success: false, message: "Could not delete user's projects and data. Aborting account deletion." };
    }

    try {
        // Then, delete the Firebase Auth user
        await deleteUser(user);
        return { success: true };
    } catch (error) {
        console.error("Error deleting user account from Auth:", error);
        return { success: false, message: getFirebaseErrorMessage(error) };
    }
};