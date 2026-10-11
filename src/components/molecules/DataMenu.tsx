'use client';

import React, { useRef } from 'react';
import { Button } from '@components/ui/button';
import { builtInData } from 'src/data/builtIn';
import { useUniverseStore } from '@store/universeStore';
import { toExportFile } from '@utils/storage';

/** Saves everything the user made to a JSON file, and reads one back. */
const DataMenu: React.FC = () => {
  const pushToast = useUniverseStore((s) => s.pushToast);
  const importData = useUniverseStore((s) => s.importData);
  const input = useRef<HTMLInputElement>(null);

  const exportFile = () => {
    const { events, universeColors } = useUniverseStore.getState();
    const file = toExportFile(events, builtInData, new Date(), universeColors);
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parallel-universes-${file.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking straight away can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      pushToast({ message: 'That file is not valid JSON.', tone: 'error' });
      return;
    }
    const result = importData(parsed);
    if (!result.ok) {
      pushToast({ message: result.error, tone: 'error' });
    } else if (result.events === 0) {
      pushToast({ message: 'Nothing new to import.', tone: 'info' });
    } else {
      const universes =
        result.universes === 1 ? '1 universe' : `${result.universes} universes`;
      const events =
        result.events === 1 ? '1 event' : `${result.events} events`;
      pushToast({
        message: `Imported ${events}${result.universes ? ` in ${universes}` : ''}.`,
        tone: 'success',
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" onClick={exportFile}>
        Export
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => input.current?.click()}
      >
        Import
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Import a file"
        tabIndex={-1}
        onChange={importFile}
      />
    </div>
  );
};

export default DataMenu;
