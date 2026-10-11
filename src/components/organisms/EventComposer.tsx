'use client';

import React, { useState } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';
import TerminalSpinner from '@components/atoms/TerminalSpinner';
import TerminalPanel from '@components/atoms/TerminalPanel';
import { EventDraft, EventNode, EventType } from 'src/data/events';
import { NewEventInput } from '@utils/timelineGraph';
import { GenerateOutcome, LogicOutcome } from '@utils/generateClient';
import LogicCheck from '@components/molecules/LogicCheck';
import { TEXT_LIMITS } from '@utils/sanitizeInput';
import { universeName } from '@utils/universeNames';

type Mode = 'generate' | 'write';
type Stage = 'form' | 'generating' | 'preview';

export interface EventComposerProps {
  /** The event the new one branches from or follows. */
  event: EventNode;
  eventType: EventType;
  existingUniverses: string[];
  /** Whether an OpenAI API key is set. Null while still checking. */
  aiAvailable: boolean | null;
  /** Live check of a date against the branching rules. */
  validate: (input: NewEventInput) => string | null;
  generate: (
    question: string,
    newUniverse?: string,
  ) => Promise<GenerateOutcome>;
  /** Saves the event. Returns an error message, or null when it was saved. */
  save: (draft: EventDraft, newUniverse?: string) => string | null;
  onCancel: () => void;
  /** Optional AI check of a draft's timing and divergence. */
  checkLogic?: (
    draft: EventDraft,
    newUniverse?: string,
  ) => Promise<LogicOutcome>;
}

const emptyDraft = (date: string): EventDraft => ({
  name: '',
  date,
  description: '',
});

/**
 * Writes a new event, by hand or with the AI. AI output is shown as a
 * preview to save, edit or try again; nothing is saved until the user says so.
 */
const EventComposer: React.FC<EventComposerProps> = ({
  event,
  eventType,
  existingUniverses,
  aiAvailable,
  validate,
  generate,
  save,
  onCancel,
  checkLogic,
}) => {
  const branching = eventType === 'Splinter';
  const canGenerate = aiAvailable !== false;
  // Until the user picks, follow whether the AI turns out to be available.
  const [mode, setMode] = useState<Mode | null>(null);
  const writing =
    !canGenerate || (mode ?? (aiAvailable ? 'generate' : 'write')) === 'write';
  const [stage, setStage] = useState<Stage>('form');
  const [question, setQuestion] = useState('');
  const [universe, setUniverse] = useState('');
  const [draft, setDraft] = useState<EventDraft>(emptyDraft(event.date));
  const [preview, setPreview] = useState<EventDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const universeTaken =
    branching && existingUniverses.includes(universe.trim())
      ? 'A universe with that name already exists. Choose another name.'
      : null;
  const dateProblem = (date: string) =>
    date.trim() ? validate({ sourceEvent: event, eventType, date }) : null;
  const draftDateProblem = writing ? dateProblem(draft.date) : null;
  const previewProblem = preview ? dateProblem(preview.date) : null;

  const newUniverse = branching ? universe : undefined;
  const busy = stage === 'generating';

  const runGeneration = async () => {
    setStage('generating');
    setError(null);
    const outcome = await generate(question, newUniverse);
    if (outcome.ok) {
      setPreview(outcome.draft);
      setStage('preview');
    } else {
      setError(outcome.error);
      setStage('form');
    }
  };

  const saveDraft = (d: EventDraft) => {
    const problem = save(d, newUniverse);
    if (problem) setError(problem);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || universeTaken) return;
    if (writing) {
      if (!draftDateProblem) saveDraft(draft);
    } else {
      void runGeneration();
    }
  };

  const editPreview = () => {
    if (!preview) return;
    setDraft(preview);
    setMode('write');
    setPreview(null);
    setStage('form');
  };

  const heading = branching
    ? 'Branch into a new universe'
    : `Continue ${universeName(event.timelineID).replace(/^Universe/, 'universe')}`;

  if (stage === 'preview' && preview) {
    return (
      <TerminalPanel
        level={3}
        title={`${heading}: preview`}
        className="space-y-4"
      >
        <article className="space-y-1 border-l-2 border-primary/60 bg-black/30 p-3">
          <p className="text-[11px] text-muted-foreground">
            INCOMING TRANSMISSION · UNSAVED
          </p>
          <h4 className="glow font-display text-xl uppercase tracking-wide text-primary">
            {preview.name}
          </h4>
          <p className="text-xs text-muted-foreground">
            [{preview.date}]{branching && <> · Universe {universe.trim()}</>}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {preview.description}
          </p>
        </article>
        {previewProblem && (
          <p role="alert" className="text-sm text-alert">
            ! {previewProblem} Edit the date or try again.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-alert">
            ! {error}
          </p>
        )}
        {checkLogic && aiAvailable && (
          <LogicCheck run={() => checkLogic(preview, newUniverse)} />
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => saveDraft(preview)}
            disabled={!!previewProblem}
          >
            Save
          </Button>
          <Button type="button" variant="outline" onClick={editPreview}>
            Edit
          </Button>
          <Button type="button" variant="outline" onClick={runGeneration}>
            Try again
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </TerminalPanel>
    );
  }

  return (
    <TerminalPanel
      level={3}
      title={heading}
      onSubmit={submit}
      aria-busy={busy}
      className="space-y-4"
    >
      <fieldset disabled={busy} className="space-y-4">
        {canGenerate && (
          <div
            role="radiogroup"
            aria-label="How to write the event"
            className="flex flex-wrap gap-2"
          >
            <Button
              type="button"
              size="sm"
              role="radio"
              aria-checked={!writing}
              variant={writing ? 'outline' : 'default'}
              onClick={() => setMode('generate')}
            >
              Generate with AI
            </Button>
            <Button
              type="button"
              size="sm"
              role="radio"
              aria-checked={writing}
              variant={writing ? 'default' : 'outline'}
              onClick={() => setMode('write')}
            >
              Write it yourself
            </Button>
          </div>
        )}
        {aiAvailable === false && (
          <p className="text-xs text-muted-foreground">
            No OpenAI API key is set up, so you write this event yourself. Add
            your own key under &quot;API key&quot; at the top to generate events
            with AI.
          </p>
        )}

        {branching && (
          <div className="space-y-1">
            <Label htmlFor="newUniverse">Name of the new universe</Label>
            <Input
              id="newUniverse"
              placeholder="e.g. The Wall stands"
              value={universe}
              maxLength={TEXT_LIMITS.timelineName}
              onChange={(e) => setUniverse(e.target.value)}
              aria-invalid={!!universeTaken}
              required
            />
            {universeTaken && (
              <p className="text-sm text-alert">{universeTaken}</p>
            )}
          </div>
        )}

        {writing ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="draftName">What happens</Label>
              <Input
                id="draftName"
                placeholder="e.g. The Berlin Wall stands"
                value={draft.name}
                maxLength={TEXT_LIMITS.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="draftDate">Date</Label>
              <Input
                id="draftDate"
                placeholder="YYYY-MM-DD"
                value={draft.date}
                maxLength={TEXT_LIMITS.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                aria-describedby="draftDateHelp"
                aria-invalid={!!draftDateProblem}
                required
              />
              <p id="draftDateHelp" className="text-xs text-muted-foreground">
                On or after {event.date}. A year on its own works too.
              </p>
              {draftDateProblem && (
                <p className="text-sm text-alert">{draftDateProblem}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="draftDescription">Description</Label>
              <Textarea
                id="draftDescription"
                placeholder="How this changes history"
                value={draft.description}
                maxLength={TEXT_LIMITS.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="question">What if…</Label>
            <Textarea
              id="question"
              placeholder="e.g. the wall had stayed up?"
              value={question}
              maxLength={TEXT_LIMITS.question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>
        )}
      </fieldset>

      {writing && checkLogic && aiAvailable && (
        <LogicCheck
          run={() => checkLogic(draft, newUniverse)}
          blocked={
            !draft.name.trim() || !draft.date.trim()
              ? 'Give the event a title and a date first.'
              : null
          }
        />
      )}
      {busy && (
        <p role="status" className="flex items-center gap-2 text-sm">
          <TerminalSpinner />
          Checking your question and writing the event. This takes a few
          seconds…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-alert">
          ! {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={busy || !!universeTaken || !!draftDateProblem}
        >
          {writing ? 'Add event' : busy ? 'Generating…' : 'Generate'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </TerminalPanel>
  );
};

export default EventComposer;
