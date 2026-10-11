import React from 'react';
import { useTranslations } from 'next-intl';

interface MainLayoutProps {
  /** Controls at the right of the header. */
  actions?: React.ReactNode;
  /** One line above the chart. */
  hint?: React.ReactNode;
  /** Controls at the right of the line above the chart. */
  chartControls?: React.ReactNode;
  chart: React.ReactNode;
  sidebar: React.ReactNode;
}

/**
 * The chart beside the sidebar on wide screens; on phones the sidebar
 * stacks under the chart.
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  actions,
  hint,
  chartControls,
  chart,
  sidebar,
}) => {
  const t = useTranslations('MainLayout');
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b-2 border-double border-border bg-card/80 px-4 py-3">
        <h1 className="glow font-display text-3xl uppercase leading-none tracking-wider text-primary">
          <span aria-hidden="true">&gt; </span>
          {t('title')}
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-[0.8em] w-[0.5em] translate-y-[0.05em] animate-[blink_1.1s_steps(1)_infinite] bg-primary motion-reduce:animate-none"
          />
        </h1>
        {actions}
      </header>

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section
          aria-label="Chart"
          className="flex min-w-0 flex-col border-b lg:h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r"
        >
          {(hint || chartControls) && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
              {hint && (
                <p className="text-xs text-muted-foreground">
                  <span aria-hidden="true">{'// '}</span>
                  {hint}
                </p>
              )}
              {chartControls}
            </div>
          )}
          <div className="h-[55vh] min-h-[320px] lg:h-auto lg:flex-1">
            {chart}
          </div>
        </section>
        <aside className="p-4 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
          {sidebar}
        </aside>
      </main>
    </div>
  );
};

export default MainLayout;
