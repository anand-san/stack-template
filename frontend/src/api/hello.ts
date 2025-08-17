import { api } from './client';

export const sendHello = async () => {
  const result = await api.hello.$get();
  const res = await result.json();
  return res.message;
};
