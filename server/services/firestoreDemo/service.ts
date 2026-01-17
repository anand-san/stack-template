import { Timestamp } from 'firebase-admin/firestore';
import { todoCollection } from './collection';
import { todoDocRef, newTodoDocRef } from './refs';
import type { Todo } from './types';

export async function createTodo(input: {
  userId: string;
  title: string;
}): Promise<{ id: string; data: Todo }> {
  const docRef = newTodoDocRef();
  const now = Timestamp.now();

  const data: Todo = {
    userId: input.userId,
    title: input.title,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(data);

  return { id: docRef.id, data };
}

export async function getTodo(input: {
  userId: string;
  id: string;
}): Promise<Todo | null> {
  const snap = await todoDocRef(input.id).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data) return null;
  if (data.userId !== input.userId) return null;

  return data;
}

export async function listTodosByUserId(
  userId: string,
): Promise<Array<{ id: string; data: Todo }>> {
  const snap = await todoCollection().where('userId', '==', userId).get();

  return snap.docs.map(d => ({
    id: d.id,
    data: d.data(),
  }));
}

export async function updateTodo(input: {
  userId: string;
  id: string;
  title?: string;
  completed?: boolean;
}): Promise<Todo | null> {
  const docRef = todoDocRef(input.id);
  const existing = await docRef.get();
  if (!existing.exists) return null;

  const current = existing.data();
  if (!current) return null;
  if (current.userId !== input.userId) return null;

  const next: Todo = {
    ...current,
    title: input.title ?? current.title,
    completed: input.completed ?? current.completed,
    updatedAt: Timestamp.now(),
  };

  await docRef.set(next);

  return next;
}

export async function deleteTodo(input: {
  userId: string;
  id: string;
}): Promise<boolean> {
  const docRef = todoDocRef(input.id);
  const existing = await docRef.get();
  if (!existing.exists) return false;

  const current = existing.data();
  if (!current) return false;
  if (current.userId !== input.userId) return false;

  await docRef.delete();
  return true;
}
