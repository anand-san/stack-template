import { ThemeToggle } from '@/components/ToggleTheme';
import { Outlet } from 'react-router-dom';

export const AppLayout = () => {
  return (
    <>
      <div className="flex absolute top-4 right-4 space-x-2">
        <ThemeToggle />
      </div>
      <Outlet />
    </>
  );
};
