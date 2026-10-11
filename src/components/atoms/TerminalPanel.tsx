import React, { useId } from 'react';
import { cn } from 'src/utils/utils';

interface TerminalPanelProps {
  title: React.ReactNode;
  /** Heading level of the title. */
  level?: 2 | 3;
  /** Amber, for warnings and destructive steps. */
  tone?: 'default' | 'alert';
  /** Classes for the content area, such as spacing between children. */
  className?: string;
  children: React.ReactNode;
  /** Rendered as a form when given. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  'aria-busy'?: boolean;
}

/**
 * A box with its title cut into the top border, like a window on a
 * text-mode terminal.
 */
const TerminalPanel: React.FC<TerminalPanelProps> = ({
  title,
  level = 2,
  tone = 'default',
  className,
  children,
  onSubmit,
  'aria-busy': busy,
}) => {
  const id = useId();
  const Heading = level === 2 ? 'h2' : 'h3';
  const Box = onSubmit ? 'form' : 'section';
  return (
    <Box
      aria-labelledby={id}
      aria-busy={busy}
      onSubmit={onSubmit}
      className={cn(
        'relative mt-3 border bg-card/60 px-4 pb-4 pt-6',
        tone === 'alert' ? 'border-alert/70' : 'border-border',
      )}
    >
      <Heading
        id={id}
        className={cn(
          'glow absolute -top-3 left-3 max-w-[calc(100%-1.5rem)] truncate bg-[var(--crt-bg)] px-2 font-display text-xl uppercase leading-6 tracking-wider',
          tone === 'alert' ? 'text-alert' : 'text-primary',
        )}
      >
        {title}
      </Heading>
      <div className={className}>{children}</div>
    </Box>
  );
};

export default TerminalPanel;
