import { firestore } from '../firebase';
import { todoConverter } from './converter';
import { TODO_COLLECTION_NAME } from './constants';

export function todoCollection() {
  return firestore
    .collection(TODO_COLLECTION_NAME)
    .withConverter(todoConverter);
}
