import { ThemeToggle } from '@/components/ToggleTheme';
import { Button } from '@/components/ui/button';
import { LogOutIcon } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import SignIn from '@/components/SignIn';

export const AppLayout = () => {
  const { signOut } = useAuth();
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out: ', error);
    }
  };
  return (
    <>
      <SignedIn>
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
      </SignedIn>
      <SignedOut>
        <SignIn />
      </SignedOut>
    </>
  );
};
