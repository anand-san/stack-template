import { Loader2 } from 'lucide-react';
export function Loader() {
  return <div className="spinner"></div>;
}

export const FullScreenLoader = () => (
  <div className="h-screen flex justify-center items-center">
    <Loader2 className="animate-spin" />
  </div>
);
