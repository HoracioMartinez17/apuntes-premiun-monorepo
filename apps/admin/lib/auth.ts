const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  if (typeof window === 'undefined') {
    return fetch(`${API_URL}${url}`, options);
  }

  const token = localStorage.getItem('token');
  console.log(`[fetchWithAuth] Calling ${url}, token exists:`, !!token);
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  console.log(`[fetchWithAuth] Response for ${url}:`, response.status);

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}

export async function login(email: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al iniciar sesión');
    }

    const data = await response.json();
    
    console.log('Response data:', data);
    console.log('access_token value:', data.access_token);
    console.log('access_token type:', typeof data.access_token);
    
    if (data.user.role !== 'admin') {
      throw new Error('Acceso denegado - Solo administradores');
    }

    if (!data.access_token) {
      throw new Error('No se recibió access_token del servidor');
    }

    // Save to localStorage
    console.log('Saving to localStorage:', {
      access_token: data.access_token ? `${data.access_token.substring(0, 20)}...` : 'undefined',
      user: data.user
    });
    
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Verify it was saved
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    console.log('Verified localStorage after save:', {
      tokenSaved: !!savedToken,
      userSaved: !!savedUser,
      tokenLength: savedToken?.length
    });
    
    console.log('Login successful:', { 
      user: data.user.email, 
      role: data.user.role 
    });
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
}

export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const isAuth = !!(token && user);
    console.log('isAuthenticated check:', { hasToken: !!token, hasUser: !!user, result: isAuth });
    return isAuth;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

export function isAdmin() {
  if (typeof window === 'undefined') return false;
  try {
    const user = getUser();
    const isAdminUser = user?.role === 'admin';
    console.log('isAdmin check:', { user: user?.email, role: user?.role, result: isAdminUser });
    return isAdminUser;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
