import { ThemeToggle } from '@/components/ToggleTheme';
import { Button } from '@/components/ui/button';
import { LogOutIcon } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import SignIn from '@/components/SignIn';
import { useAuth } from '@/context/auth/AuthContextProvider';
import { FullScreenLoader } from '@/components/loader';

export const AppLayout = () => {
  const { signOut } = useAuth();
  const { user, isLoading } = useAuth();
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out: ', error);
    }
  };

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <SignIn />;
  }
  return (
    <>
      <div className="flex absolute top-4 right-4 space-x-2">
        <ThemeToggle />
        <Button
          variant={'ghost'}
          size="icon"
          className="rounded-full"
          onClick={handleLogout}
        >
          <LogOutIcon className="h-4 w-4" />
        </Button>
      </div>

      <Outlet />
    </>
  );
};
