'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthCard from '@components/templates/AuthCard';
import { signIn } from '../../../utils/userAuth';
const AuthPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState<string | null>(null);

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const user = await signIn(
        email,
        password,
        setVerificationRequired,
        setEmailToVerify,
      );
      if (!user) return;

      router.push('/');
    } catch {
      setError('Wrong email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('still in beta');
    // TODO: Implement sign up with protections
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
        isLoading={isLoading}
        verificationRequired={verificationRequired}
        emailToVerify={emailToVerify}
      />
    </div>
  );
};

export default AuthPage;
