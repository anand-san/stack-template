import type { DocumentReference } from './queryTypes';
import { todoCollection } from './collection';
import type { Todo } from './types';

export function todoDocRef(id: string): DocumentReference<Todo> {
  return todoCollection().doc(id) as DocumentReference<Todo>;
}

export function newTodoDocRef(): DocumentReference<Todo> {
  return todoCollection().doc() as DocumentReference<Todo>;
}
