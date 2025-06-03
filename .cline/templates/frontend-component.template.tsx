import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface ComponentNameProps {
  // Define props interface here
  id?: string;
  className?: string;
}

interface ComponentNameData {
  // Define data interface here
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ 
  id, 
  className = '' 
}) => {
  const [data, setData] = useState<ComponentNameData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Replace with actual API call
      const response = await fetch('/api/endpoint');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (itemId: string) => {
    try {
      setLoading(true);
      
      // Replace with actual API call
      const response = await fetch(`/api/endpoint/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'update' }),
      });
      
      if (!response.ok) {
        throw new Error('Action failed');
      }
      
      toast({
        title: "Success",
        description: "Action completed successfully",
      });
      
      // Refresh data
      await fetchData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
            <Button 
              onClick={fetchData} 
              variant="outline" 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Component Title</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No data available
          </p>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    Status: {item.status}
                  </p>
                  <p className="text-xs text-gray-400">
                    Created: {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={() => handleAction(item.id)}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Action'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex justify-between items-center">
          <Button 
            onClick={fetchData} 
            variant="outline"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
          
          <span className="text-sm text-gray-500">
            {data.length} items
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComponentName;
