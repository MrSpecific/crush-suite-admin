import { redirect } from 'next/navigation';

export default function Unauthenticated() {
  redirect('/api/auth/signin');
  return null;
}
