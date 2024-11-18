import { api } from "./client";

export const getApiStatus = async () => {
  const result = await api.health.$get();
  return await result.text();
};
