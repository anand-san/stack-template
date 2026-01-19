import type { QueryDocumentSnapshot } from './queryTypes';
import { todoSchema, type Todo } from './types';

export interface FirestoreDataConverter<T> {
  toFirestore: (data: T) => Record<string, unknown>;
  fromFirestore: (snapshot: QueryDocumentSnapshot) => T;
}

export const todoConverter: FirestoreDataConverter<Todo> = {
  toFirestore: (data: Todo) => data as unknown as Record<string, unknown>,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => {
    const data = snapshot.data();
    return todoSchema.parse(data);
  },
};
