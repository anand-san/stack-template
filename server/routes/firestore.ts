import { Hono } from 'hono';
import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { firestore } from '../services/firebase';

type DemoDoc = {
  userId: string;
  title: string;
  createdAt: Timestamp;
};

const demoDocConverter: FirestoreDataConverter<DemoDoc> = {
  toFirestore: (data: DemoDoc) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot) =>
    snapshot.data() as DemoDoc,
};

export const firestoreRoute = new Hono().get('/demo', async c => {
  const user = c.get('user');
  const userId = user.uid;

  const docRef = firestore
    .collection('demo')
    .withConverter(demoDocConverter)
    .doc();

  const toWrite: DemoDoc = {
    userId,
    title: 'demo',
    createdAt: Timestamp.now(),
  };

  await docRef.set(toWrite);

  const snap = await docRef.get();

  return c.json({ id: docRef.id, data: snap.data() });
});
