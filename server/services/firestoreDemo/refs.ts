import type { DocumentReference } from 'firebase-admin/firestore';
import { todoCollection } from './collection';
import type { Todo } from './types';

export function todoDocRef(id: string): DocumentReference<Todo> {
  return todoCollection().doc(id);
}

export function newTodoDocRef(): DocumentReference<Todo> {
  return todoCollection().doc();
}
