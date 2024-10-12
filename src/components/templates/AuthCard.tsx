import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'src/components/ui/card';
import LoginForm from '@components/organisms/LoginForm';
import RegisterForm from '@components/organisms/RegisterForm';
import { Button } from '@components/ui/button';
import Spinner from '@components/atoms/Spinner';

interface AuthCardProps {
  onLoginSubmit: (event: React.FormEvent) => void;
  onRegisterSubmit: (event: React.FormEvent) => void;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  error: string;
  isLoading: boolean;
  verificationRequired: boolean;
  emailToVerify: string | null;
}

const AuthCard: React.FC<AuthCardProps> = ({
  onLoginSubmit,
  onRegisterSubmit,
  email,
  setEmail,
  password,
  setPassword,
  error,
  isLoading,
  verificationRequired,
  emailToVerify,
}) => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleAuthMode = () => {
    setIsLogin((prev) => !prev);
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{isLogin ? 'Login' : 'Create Account'}</CardTitle>
        <CardDescription>
          {isLogin ? 'Login to your account' : 'Register a new account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {verificationRequired ? (
          <div className="verification-message">
            <p>
              Please verify your email address. A verification email has been
              sent to <strong>{emailToVerify}</strong>.
            </p>
            <Button onClick={toggleAuthMode}>Resend Verification Email</Button>
          </div>
        ) : isLogin ? (
          <LoginForm
            onSubmit={onLoginSubmit}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
          />
        ) : (
          <RegisterForm
            onSubmit={onRegisterSubmit}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex justify-end">
          {isLogin ? (
            <>
              <Button type="submit" form="login-form" disabled={isLoading}>
                {isLoading ? <Spinner size="small" /> : 'Login'}
              </Button>
              {/* <Button variant="link" onClick={toggleAuthMode}>
                Don't have an account? Register
              </Button> */}
            </>
          ) : (
            <>
              <Button type="submit" form="register-form" disabled={isLoading}>
                {isLoading ? <Spinner size="small" /> : 'Register'}
              </Button>
              <Button variant="link" onClick={toggleAuthMode}>
                Already have an account? Login
              </Button>
            </>
          )}
        </div>
        {error && <div className="mt-2 text-center text-red-500">{error}</div>}
      </CardFooter>
    </Card>
  );
};

export default AuthCard;
