import { useAuth } from '@/context/auth/useAuth';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex justify-center items-center flex-col">
      <p>Welcome{user?.displayName ? `, ${user.displayName}` : ''}</p>
    </div>
  );
}
