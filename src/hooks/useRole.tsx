
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'donor' | 'admin' | 'agent';

export const useRole = () => {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'donor'; // Default to donor role
      }
      
      return data?.role as UserRole;
    },
    enabled: !!user?.id
  });

  return {
    role,
    isLoading,
    isAdmin: role === 'admin',
    isDonor: role === 'donor',
    isAgent: role === 'agent'
  };
};
