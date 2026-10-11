import React, { useEffect, useState } from 'react';
import { Button } from '@components/ui/button';

interface ConfirmButtonProps {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  title?: string;
}

/**
 * A destructive button that needs two clicks. The first click arms it and
 * changes the label; it disarms itself after a few seconds.
 */
const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  title,
}) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      type="button"
      variant={armed ? 'destructive' : 'outline'}
      disabled={disabled}
      title={title}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
};

export default ConfirmButton;
