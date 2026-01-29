import { useEffect, useState } from 'react';

export function useUserId(): string {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    let storedUserId = localStorage.getItem('userId');
    
    if (!storedUserId) {
      // Generate a simple UUID-like ID
      storedUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('userId', storedUserId);
    }
    
    setUserId(storedUserId);
  }, []);

  return userId;
}