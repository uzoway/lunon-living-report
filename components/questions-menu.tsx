'use client';

import * as Popover from '@radix-ui/react-popover';
import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';

import {questionsToMarkdown, type Question} from '@/lib/questions.ts';

import {announce} from './announce.ts';
import {claimText} from './claim-text.ts';
import {CloseIcon} from './close-icon.tsx';
import {mayReturnFocus} from './focus.ts';
import {JaText} from './ja-text.tsx';
import {setQuestions, useQuestions, useStorable} from './questions-store.ts';
import {useReader, type ClaimRef} from './reader-state.tsx';
import {Sheet} from './sheet.tsx';
import {useLayoutMode} from './use-layout-mode.ts';

const TITLE_ID = 'questions-title';

/** The first claim below the sticky header, for a question started here. */
function claimInView(): string | undefined {
  const header = document
    .querySelector('.site-header')
    ?.getBoundingClientRect();
  for (const element of document.querySelectorAll<HTMLElement>(
    '#report [data-claim]'
  )) {
    if (element.getBoundingClientRect().bottom > (header?.bottom ?? 0)) {
      return element.dataset.claim;
    }
  }
  return undefined;
}

/** The header button and the panel it opens: a popover, or a sheet on phones. */
export function QuestionsMenu() {
  const {panel, setPanel} = useReader();
  const questions = useQuestions();
  const mode = useLayoutMode();
  const trigger = useRef<HTMLButtonElement>(null);
  // After "Go to claim", focus stays on the claim instead of the button.
  const leftForClaim = useRef(false);

  function onOpenChange(open: boolean) {
    setPanel({open});
  }

  function onCloseAutoFocus(event: Event) {
    event.preventDefault();
    if (!leftForClaim.current && mayReturnFocus(event)) {
      trigger.current?.focus();
    }
    leftForClaim.current = false;
  }

  const label = (
    <>
      <QuestionIcon />
      <span className="header-label">Questions</span>
      {questions.length > 0 && (
        <span className="count">{questions.length}</span>
      )}
    </>
  );
  const body = (
    <QuestionsBody
      onLeaveForClaim={() => {
        leftForClaim.current = true;
      }}
    />
  );

  if (mode === 'sheet') {
    return (
      <>
        <button
          ref={trigger}
          type="button"
          className="header-button"
          onClick={() => setPanel({open: true})}
        >
          {label}
        </button>
        <Sheet
          open={panel.open}
          onOpenChange={onOpenChange}
          title="Questions"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          {body}
        </Sheet>
      </>
    );
  }

  return (
    <Popover.Root open={panel.open} onOpenChange={onOpenChange}>
      <Popover.Trigger ref={trigger} className="header-button">
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="card questions-card"
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-labelledby={TITLE_ID}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <div className="card-header">
            <h2 id={TITLE_ID} className="card-title">
              Questions
            </h2>
            <Popover.Close className="icon-button" aria-label="Close">
              <CloseIcon />
            </Popover.Close>
          </div>
          {body}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function QuestionsBody({onLeaveForClaim}: {onLeaveForClaim: () => void}) {
  const {claims, sectionTitles, title, panel, setPanel} = useReader();
  const questions = useQuestions();
  const storable = useStorable();
  const [removed, setRemoved] = useState<{question: Question; index: number}>();
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  // Reading order, which is also the order of the export.
  const ordered = claims.flatMap(claim =>
    questions.filter(q => q.claimId === claim.id).map(q => ({q, claim}))
  );
  const markdown = () =>
    questionsToMarkdown(questions, {
      title,
      claims: claims.map(c => ({...c, text: claimText(c.id)})),
      sectionTitles,
    });

  function remove(question: Question) {
    const index = questions.indexOf(question);
    setQuestions(questions.filter(q => q !== question));
    setRemoved({question, index});
    announce('Question deleted');
  }

  function undo() {
    if (!removed) return;
    const next = [...questions];
    next.splice(removed.index, 0, removed.question);
    setQuestions(next);
    setRemoved(undefined);
    announce('Question restored');
  }

  function goToClaim(claimId: string) {
    const element = document.querySelector<HTMLElement>(
      `#report [data-claim="${claimId}"]`
    );
    if (!element) return;
    onLeaveForClaim();
    setPanel({open: false});
    element.setAttribute('tabindex', '-1');
    element.scrollIntoView({block: 'center'});
    element.focus({preventScroll: true});
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown());
      setCopy('copied');
      announce('Questions copied as Markdown');
      setTimeout(() => setCopy('idle'), 2000);
    } catch {
      setCopy('failed');
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([markdown()], {type: 'text/markdown'})
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'questions-report-51.md';
    link.click();
    URL.revokeObjectURL(url);
    announce('Questions downloaded as Markdown');
  }

  return (
    <div className="questions-body">
      {panel.draftClaimId ? (
        <Composer claimId={panel.draftClaimId} />
      ) : (
        <button
          type="button"
          className="source-trace"
          onClick={() =>
            setPanel({
              open: true,
              draftClaimId: claimInView() ?? claims[0]?.id,
            })
          }
        >
          New question
        </button>
      )}

      {!storable && (
        <p className="questions-note">
          This browser is blocking storage, so these questions last until you
          leave the page. Copy or download them first.
        </p>
      )}

      {removed && (
        <p className="questions-undo" role="status">
          Question deleted.
          <button type="button" className="text-button" onClick={undo}>
            Undo
          </button>
        </p>
      )}

      {ordered.length === 0 ? (
        <p className="questions-note">
          No questions yet. Pick a sentence in the report and choose Ask about
          this, or start one here.
        </p>
      ) : (
        <ol className="questions">
          {ordered.map(({q, claim}, i) => (
            <QuestionItem
              key={q.id}
              question={q}
              claim={claim}
              position={i + 1}
              sectionTitle={sectionTitles.get(claim.sectionId) ?? ''}
              onGoTo={() => goToClaim(claim.id)}
              onDelete={() => remove(q)}
            />
          ))}
        </ol>
      )}

      <div className="questions-export">
        <button
          type="button"
          className="text-button"
          disabled={questions.length === 0}
          onClick={copyMarkdown}
        >
          {copy === 'copied' ? 'Copied' : 'Copy as Markdown'}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={questions.length === 0}
          onClick={download}
        >
          Download .md
        </button>
      </div>
      {copy === 'failed' && (
        <p className="questions-note" role="status">
          This browser didn&rsquo;t allow copying. Download the file instead.
        </p>
      )}
    </div>
  );
}

/** A new question about one claim, which the reader can change here. */
function Composer({claimId}: {claimId: string}) {
  const {claims, sectionTitles, setPanel} = useReader();
  const questions = useQuestions();
  const [text, setText] = useState('');
  // Every claim, grouped by section, with its text read from the page.
  const groups = useMemo(() => {
    const bySection = new Map<string, Array<{id: string; text: string}>>();
    for (const {id, sectionId} of claims) {
      const entry = {id, text: claimText(id)};
      bySection.set(sectionId, [...(bySection.get(sectionId) ?? []), entry]);
    }
    return [...bySection];
  }, [claims]);
  const quote = useMemo(() => claimText(claimId), [claimId]);

  function save(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const question: Question = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      claimId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setQuestions([...questions, question]);
    setPanel({open: true});
    announce('Question saved');
  }

  return (
    <form className="composer" onSubmit={save}>
      <label className="composer-label" htmlFor="question-claim">
        About
      </label>
      <select
        id="question-claim"
        className="composer-select"
        value={claimId}
        onChange={event =>
          setPanel({open: true, draftClaimId: event.target.value})
        }
      >
        {groups.map(([sectionId, sectionClaims]) => (
          <optgroup key={sectionId} label={sectionTitles.get(sectionId)}>
            {sectionClaims.map(c => (
              <option key={c.id} value={c.id}>
                {c.text.length > 72 ? `${c.text.slice(0, 72)}…` : c.text}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {quote && (
        <blockquote className="composer-quote">
          <JaText text={quote} />
        </blockquote>
      )}
      <label className="composer-label" htmlFor="question-text">
        Your question
      </label>
      <textarea
        id="question-text"
        className="composer-text"
        rows={3}
        value={text}
        // The reader asked to write a question, so the cursor goes there.
        autoFocus
        onChange={event => setText(event.target.value)}
      />
      <div className="composer-actions">
        <button
          type="button"
          className="text-button"
          onClick={() => setPanel({open: true})}
        >
          Cancel
        </button>
        <button type="submit" className="source-open" disabled={!text.trim()}>
          Save question
        </button>
      </div>
    </form>
  );
}

function QuestionItem({
  question,
  claim,
  position,
  sectionTitle,
  onGoTo,
  onDelete,
}: {
  question: Question;
  claim: ClaimRef;
  position: number;
  sectionTitle: string;
  onGoTo: () => void;
  onDelete: () => void;
}) {
  const questions = useQuestions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.text);
  const editor = useRef<HTMLTextAreaElement>(null);
  const quote = useMemo(() => claimText(claim.id), [claim.id]);

  // Editing continues the question, so the caret starts at its end.
  useEffect(() => {
    const field = editor.current;
    if (!editing || !field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [editing]);

  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setQuestions(
      questions.map(q =>
        q.id === question.id ? {...q, text: draft.trim()} : q
      )
    );
    setEditing(false);
    announce('Question updated');
  }

  const which = <span className="sr-only">{` question ${position}`}</span>;
  return (
    <li className="question">
      <p className="question-section">
        <JaText text={sectionTitle} />
      </p>
      <button type="button" className="question-claim" onClick={onGoTo}>
        <span className="sr-only">Go to claim: </span>
        <JaText text={quote} />
      </button>
      {editing ? (
        <form className="composer" onSubmit={save}>
          <label className="sr-only" htmlFor={`edit-${question.id}`}>
            Edit question {position}
          </label>
          <textarea
            ref={editor}
            id={`edit-${question.id}`}
            className="composer-text"
            rows={3}
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
          <div className="composer-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setDraft(question.text);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="source-open"
              disabled={!draft.trim()}
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <p className="question-text">{question.text}</p>
      )}
      {!editing && (
        <div className="question-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => setEditing(true)}
          >
            Edit{which}
          </button>
          <button type="button" className="text-button" onClick={onDelete}>
            Delete{which}
          </button>
        </div>
      )}
    </li>
  );
}

function QuestionIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10 9.8a2 2 0 1 1 2.9 1.8c-.6.3-.9.8-.9 1.4v.3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}
