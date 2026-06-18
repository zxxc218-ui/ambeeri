import { cookies } from 'next/headers';
import { verifyJWT } from './jwt';

export async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  
  const decoded = await verifyJWT(token);
  if (!decoded) return null;
  
  return decoded;
}
