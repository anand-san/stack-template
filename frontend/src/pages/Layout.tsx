import { ThemeToggle } from '@/components/ToggleTheme';
import { Button } from '@/components/ui/button';
import { LogOutIcon } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

export const AppLayout = () => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out: ', error);
    }
  };
  return (
    <div className="w-full h-full">
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
    </div>
  );
};
