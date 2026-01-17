import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { todoSchema, type Todo } from './types';

export const todoConverter: FirestoreDataConverter<Todo> = {
  toFirestore: (data: Todo) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => {
    const data = snapshot.data();
    return todoSchema.parse(data);
  },
};
