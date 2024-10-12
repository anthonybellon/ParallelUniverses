'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard from '@components/templates/AuthCard';
import { signIn, signUp } from '../../../utils/userAuth';
const AuthPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // State for loading indicator
  const [verificationRequired, setVerificationRequired] = useState(false); // State for verification required
  const [emailToVerify, setEmailToVerify] = useState<string | null>(null); // State to store email for verification

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true); // Start loading
    try {
      const user = await signIn(
        email,
        password,
        setVerificationRequired,
        setEmailToVerify,
      );
      if (!user) return; // Stop if the verification is required

      router.push('/'); // Redirect to home page after successful login
    } catch (error: any) {
      setError('Wrong email or password');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('still in beta');
    // event.preventDefault();
    // try {
    //   const user = await signUp(email, password, setIsLoading);
    //   console.log('User signed up:', user);
    // } catch (error: any) {
    //   setError(error.message);
    // }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <AuthCard
        onLoginSubmit={handleLoginSubmit}
        onRegisterSubmit={handleRegisterSubmit}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        error={error}
        isLoading={isLoading} // Pass loading state to the component
        verificationRequired={verificationRequired} // Pass verification state to the component
        emailToVerify={emailToVerify} // Pass email for verification
      />
    </div>
  );
};

export default AuthPage;
