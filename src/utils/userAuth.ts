import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
  deleteUser as firebaseDeleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  updateEmail,
  User,
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import { FirebaseError } from 'firebase/app';

export const signUp = async (
  email: string,
  password: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  try {
    setLoading(true);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;
    await sendEmailVerification(user);
    alert(
      'A verification email has been sent to your email address! Please verify your email to login.',
    );
    return user;
  } catch (error) {
    if (error instanceof FirebaseError) {
      generateFirebaseAuthErrorMessage(error);
    }
    console.error(error);
    throw error; // Propagate error to handle it in the UI
  } finally {
    setLoading(false);
  }
};

export const signIn = async (
  email: string,
  password: string,
  setVerificationRequired: React.Dispatch<React.SetStateAction<boolean>>,
  setEmailToVerify: React.Dispatch<React.SetStateAction<string | null>>,
) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;
    if (!user.emailVerified) {
      setVerificationRequired(true);
      setEmailToVerify(email);
      await firebaseSignOut(auth);
      return null; // Return null if verification is required
    }
    return user;
  } catch (error) {
    if (error instanceof FirebaseError) {
      generateFirebaseAuthErrorMessage(error);
    }
    console.error(error);
    throw error; // Propagate error to handle it in the UI
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

export const updateUserEmail = async (
  email: string,
  newEmail: string,
  password: string,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  try {
    if (auth.currentUser === null) return;
    setIsLoading(true);

    const credential = EmailAuthProvider.credential(email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);

    await updateEmail(auth.currentUser, newEmail);
    await sendEmailVerification(auth.currentUser);
    alert(
      `A verification email has been sent to your new email address ${newEmail}! Please verify your email to login.`,
    );
  } catch (error) {
    if (error instanceof FirebaseError) {
      generateFirebaseAuthErrorMessage(error);
    }
    console.error(error);
    throw error; // Propagate error to handle it in the UI
  } finally {
    setIsLoading(false);
  }
};

export const updatePassword = async (user: User, newPassword: string) => {
  try {
    await firebaseUpdatePassword(user, newPassword);
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (user: User) => {
  try {
    await firebaseDeleteUser(user);
  } catch (error) {
    throw error;
  }
};

export const reauthenticate = async (user: User, password: string) => {
  try {
    if (user.email === null) {
      throw new Error('User email is null');
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  } catch (error) {
    throw error;
  }
};

export const sendVerificationEmail = async (user: User) => {
  try {
    await sendEmailVerification(user);
  } catch (error) {
    throw error;
  }
};

function generateFirebaseAuthErrorMessage(error: FirebaseError) {
  // Mapping Firebase error codes to user-friendly messages
  const errorMessageMap: Record<string, string> = {
    'auth/invalid-email': 'The email address is not valid.',
    'auth/user-disabled': 'The user account has been disabled.',
    'auth/user-not-found': 'No user found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'This email is already in use.',
    'auth/weak-password': 'The password is too weak.',
    // Add more as needed
  };

  return errorMessageMap[error.code] || 'An unknown error occurred.';
}
