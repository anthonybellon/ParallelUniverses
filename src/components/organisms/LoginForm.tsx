import React, { ChangeEvent } from 'react';
import FormField from '@components/molecules/FormField';

interface LoginFormProps {
  onSubmit: (event: React.FormEvent) => void;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  error: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  email,
  setEmail,
  password,
  setPassword,
  error,
}) => (
  <form id="login-form" onSubmit={onSubmit}>
    <div className="grid w-full items-center gap-4">
      <FormField
        type="email"
        id="email"
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChange={(e: string | ChangeEvent<HTMLInputElement>) => {
          if (typeof e === 'string') return;
          setEmail(e.target.value);
        }}
      />
      <FormField
        id="password"
        label="Password"
        placeholder="Enter your password"
        type="password"
        value={password}
        onChange={(e: string | ChangeEvent<HTMLInputElement>) => {
          if (typeof e === 'string') return;
          setPassword(e.target.value);
        }}
      />
      {error && <p className="text-red-500">{error}</p>}
    </div>
  </form>
);

export default LoginForm;
