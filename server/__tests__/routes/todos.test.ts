import { describe, it, expect, beforeEach } from 'bun:test';
import app from '../../app';
import { createTestClient, parseJsonResponse } from '../utils/test-client';
import {
  setMockVerifyIdToken,
  resetAllMocks,
  seedFirestore,
  getFirestoreData,
  clearFirestore,
} from '../mocks/firebase-admin';

describe('Todos API', () => {
  const client = createTestClient(app);
  const validToken = 'valid-test-token';
  const testUserId = 'test-user-123';

  beforeEach(() => {
    resetAllMocks();
    setMockVerifyIdToken({
      uid: testUserId,
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  describe('Authentication', () => {
    it('should return 401 without Authorization header', async () => {
      const response = await client.get('/api/todos');

      expect(response.status).toBe(401);
      const body = await parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Not Authenticated');
    });

    it('should return 401 with invalid token format', async () => {
      const response = await client.request('/api/todos', {
        headers: { Authorization: 'InvalidFormat token' },
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 when token verification fails', async () => {
      setMockVerifyIdToken(new Error('Invalid token'));

      const response = await client.authenticatedRequest(
        '/api/todos',
        validToken,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/todos', () => {
    beforeEach(() => {
      clearFirestore();
    });

    it('should return empty array when user has no todos', async () => {
      const response = await client.authenticatedRequest(
        '/api/todos',
        validToken,
      );

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ data: unknown[] }>(response);
      expect(body.data).toEqual([]);
    });

    it('should return only todos belonging to the authenticated user', async () => {
      seedFirestore('todos', {
        'todo-1': { userId: testUserId, title: 'My todo', completed: false },
        'todo-2': {
          userId: 'other-user',
          title: 'Other todo',
          completed: false,
        },
      });

      const response = await client.authenticatedRequest(
        '/api/todos',
        validToken,
      );

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{
        data: Array<{ id: string; data: { title: string } }>;
      }>(response);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].data.title).toBe('My todo');
    });
  });

  describe('POST /api/todos', () => {
    beforeEach(() => {
      clearFirestore();
    });

    it('should create a new todo', async () => {
      const response = await client.authenticatedRequest(
        '/api/todos',
        validToken,
        {
          method: 'POST',
          body: { title: 'New Todo' },
        },
      );

      expect(response.status).toBe(201);
      const body = await parseJsonResponse<{
        id: string;
        data: { title: string; completed: boolean };
      }>(response);
      expect(body.id).toBeDefined();
      expect(body.data.title).toBe('New Todo');
      expect(body.data.completed).toBe(false);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await client.authenticatedRequest(
        '/api/todos',
        validToken,
        {
          method: 'POST',
          body: { invalid: 'data' },
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/todos/:id', () => {
    beforeEach(() => {
      clearFirestore();
    });

    it('should return a specific todo', async () => {
      seedFirestore('todos', {
        'todo-123': {
          userId: testUserId,
          title: 'Specific todo',
          completed: true,
        },
      });

      const response = await client.authenticatedRequest(
        '/api/todos/todo-123',
        validToken,
      );

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{
        id: string;
        data: { title: string };
      }>(response);
      expect(body.data.title).toBe('Specific todo');
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await client.authenticatedRequest(
        '/api/todos/non-existent',
        validToken,
      );

      expect(response.status).toBe(404);
    });

    it("should return 404 when accessing another user's todo", async () => {
      seedFirestore('todos', {
        'todo-123': {
          userId: 'other-user',
          title: 'Not mine',
          completed: false,
        },
      });

      const response = await client.authenticatedRequest(
        '/api/todos/todo-123',
        validToken,
      );

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/todos/:id', () => {
    beforeEach(() => {
      clearFirestore();
    });

    it('should update a todo', async () => {
      seedFirestore('todos', {
        'todo-123': { userId: testUserId, title: 'Original', completed: false },
      });

      const response = await client.authenticatedRequest(
        '/api/todos/todo-123',
        validToken,
        {
          method: 'PUT',
          body: { title: 'Updated', completed: true },
        },
      );

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{
        data: { title: string; completed: boolean };
      }>(response);
      expect(body.data.title).toBe('Updated');
      expect(body.data.completed).toBe(true);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await client.authenticatedRequest(
        '/api/todos/non-existent',
        validToken,
        {
          method: 'PUT',
          body: { title: 'Update' },
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    beforeEach(() => {
      clearFirestore();
    });

    it('should delete a todo', async () => {
      seedFirestore('todos', {
        'todo-123': {
          userId: testUserId,
          title: 'To delete',
          completed: false,
        },
      });

      const response = await client.authenticatedRequest(
        '/api/todos/todo-123',
        validToken,
        {
          method: 'DELETE',
        },
      );

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ message: string; id: string }>(
        response,
      );
      expect(body.message).toBe('Deleted');
      expect(body.id).toBe('todo-123');

      // Verify it's actually deleted
      const data = getFirestoreData('todos');
      expect(data['todo-123']).toBeUndefined();
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await client.authenticatedRequest(
        '/api/todos/non-existent',
        validToken,
        {
          method: 'DELETE',
        },
      );

      expect(response.status).toBe(404);
    });
  });
});
