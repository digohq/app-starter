'use client';

import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
}

export default function HealthCheck() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Next.js automatically loads .env files
        // NEXT_PUBLIC_ prefix makes it available in the browser
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/health`);

        if (!response.ok) {
          throw new Error('Health check failed');
        }

        const data: HealthStatus = await response.json();
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="p-4 border rounded">
        <p className="text-muted-foreground">Checking API health...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded bg-destructive-light">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-success rounded bg-success-light">
      <h3 className="font-semibold mb-2">API Status</h3>
      <p className="text-sm text-foreground">Status: {health?.status}</p>
      <p className="text-sm text-foreground">Service: {health?.service}</p>
      <p className="text-sm text-muted-foreground">Last checked: {health?.timestamp}</p>
    </div>
  );
}
