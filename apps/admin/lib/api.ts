import { fetchWithAuth } from "./auth";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "user" | "admin";
  hasAccess: boolean;
  createdAt: string;
}

export interface AccessTokenResponse {
  token: string;
  expiresAt: string;
  emailSent: boolean;
}

export interface Apunte {
  id: string;
  title: string;
  content?: string;
  modules?: {
    title: string;
    lessons: {
      title: string;
      content_md: string;
    }[];
  }[];
  category?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIGenerationStatus {
  id: string;
  topic: string;
  status: "running" | "completed" | "failed" | "cancelled";
  processed: number;
  total: number;
  apunteId?: string;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  customerEmail: string;
  customerName?: string;
  createdAt: string;
  completedAt?: string;
  user?: User;
}

export interface Stats {
  totalSales: number;
  totalRevenue: number;
  byPaymentMethod: Record<string, number>;
  pendingPurchases: number;
  failedPurchases: number;
}

// Users API
export async function getUsers(): Promise<User[]> {
  const response = await fetchWithAuth("/users");
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

export async function updateUserAccess(
  userId: string,
  hasAccess: boolean,
): Promise<User> {
  const response = await fetchWithAuth(`/users/${userId}/access`, {
    method: "PATCH",
    body: JSON.stringify({ hasAccess }),
  });
  if (!response.ok) throw new Error("Failed to update user access");
  return response.json();
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetchWithAuth(`/users/${userId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete user");
}

export async function createUser(data: {
  email: string;
  password: string;
  name?: string;
  role?: "user" | "admin";
  hasAccess?: boolean;
}): Promise<User> {
  const response = await fetchWithAuth("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create user");
  return response.json();
}

export async function generateUserAccessToken(
  userId: string,
): Promise<AccessTokenResponse> {
  const response = await fetchWithAuth(`/users/${userId}/access-token`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to generate access token");
  return response.json();
}

// Apuntes API
export async function getApuntes(): Promise<Apunte[]> {
  const response = await fetchWithAuth("/apuntes");
  if (!response.ok) throw new Error("Failed to fetch apuntes");
  return response.json();
}

export async function getApunte(id: string): Promise<Apunte> {
  const response = await fetchWithAuth(`/apuntes/${id}`);
  if (!response.ok) throw new Error("Failed to fetch apunte");
  return response.json();
}

export async function createApunte(data: Partial<Apunte>): Promise<Apunte> {
  const response = await fetchWithAuth("/apuntes", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create apunte");
  return response.json();
}

export async function updateApunte(id: string, data: Partial<Apunte>): Promise<Apunte> {
  const response = await fetchWithAuth(`/apuntes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.message || `Failed to update apunte (${response.status})`;
    console.error("Update error response:", errorData);
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function deleteApunte(id: string): Promise<void> {
  const response = await fetchWithAuth(`/apuntes/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete apunte");
}

export async function generateApunteWithAI(topic: string): Promise<Apunte> {
  const response = await fetchWithAuth("/apuntes/generate", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
  if (!response.ok) throw new Error("Failed to generate apunte with AI");
  return response.json();
}

export async function startApunteGeneration(topic: string): Promise<{ jobId: string }> {
  const response = await fetchWithAuth("/apuntes/generate/start", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
  if (!response.ok) throw new Error("Failed to start apunte generation");
  return response.json();
}

export async function getApunteGenerationStatus(
  jobId: string,
): Promise<AIGenerationStatus> {
  const response = await fetchWithAuth(`/apuntes/generate/${jobId}`);
  if (!response.ok) throw new Error("Failed to fetch generation status");
  return response.json();
}

export async function cancelApunteGeneration(
  jobId: string,
): Promise<{ status: AIGenerationStatus["status"] }> {
  const response = await fetchWithAuth(`/apuntes/generate/${jobId}/cancel`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to cancel generation");
  return response.json();
}

// Purchases API
export async function getPurchases(): Promise<Purchase[]> {
  const response = await fetchWithAuth("/payments/purchases");
  if (!response.ok) throw new Error("Failed to fetch purchases");
  return response.json();
}

export async function getStats(): Promise<Stats> {
  const response = await fetchWithAuth("/payments/stats");
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}
