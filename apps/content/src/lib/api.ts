import { fetchWithAuth } from './auth';

export interface Apunte {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getApuntes(): Promise<Apunte[]> {
  const response = await fetchWithAuth('/apuntes/published');
  if (!response.ok) {
    throw new Error('Failed to fetch apuntes');
  }
  return response.json();
}

export async function getApunte(id: string): Promise<Apunte> {
  const response = await fetchWithAuth(`/apuntes/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch apunte');
  }
  return response.json();
}
