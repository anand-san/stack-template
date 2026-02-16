import { useState } from 'react';
import { sendHello } from '../api/hello';
import { Button } from '@/components/ui/button';
import { Hand, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth/useAuth';

export default function Home() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePingHello = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await sendHello();
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center flex-col">
      <p>Hello {user?.displayName || user?.email}, This is a protected Route</p>

      <div style={{ marginTop: '20px' }}>
        <Button onClick={handlePingHello} disabled={isLoading} className="w-xs">
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              Ping Server
              <Hand className="animate-bounce" />
            </>
          )}
        </Button>

        {response && <div>{response}</div>}

        {error && (
          <div>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}
