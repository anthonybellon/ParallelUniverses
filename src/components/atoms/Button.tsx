import React from 'react';

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  type = 'button',
  onClick,
  disabled,
  children,
}) => (
  <button type={type} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

export default Button;
