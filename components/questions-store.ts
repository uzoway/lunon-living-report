'use client';

import {useSyncExternalStore} from 'react';

import type {Question} from '@/lib/questions.ts';

const KEY = 'lunon-living-report:questions';
const NONE: Question[] = [];

let questions: Question[] | undefined;
let storable = true;
const listeners = new Set<() => void>();

function isQuestion(value: unknown): value is Question {
  if (typeof value !== 'object' || value === null) return false;
  const {id, claimId, text, createdAt} = value as Record<string, unknown>;
  return [id, claimId, text, createdAt].every(f => typeof f === 'string');
}

/** Reads saved questions once. Blocked storage leaves an empty list. */
function current(): Question[] {
  if (questions) return questions;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    questions = Array.isArray(saved) ? saved.filter(isQuestion) : [];
  } catch {
    storable = false;
    questions = [];
  }
  return questions;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Replaces the questions and saves them if the browser allows it. */
export function setQuestions(next: Question[]) {
  questions = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    storable = false;
  }
  listeners.forEach(listener => listener());
}

export function useQuestions(): Question[] {
  return useSyncExternalStore(subscribe, current, () => NONE);
}

/** False once a read or write has failed, so the panel can say so. */
export function useStorable(): boolean {
  useQuestions();
  return storable;
}
