
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'donor' | 'agent';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useRole();

  // Show loading while checking auth and role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-red-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If no specific role required, just check authentication
  if (!requiredRole) {
    return <>{children}</>;
  }

  // Check if user has required role
  if (requiredRole && role !== requiredRole) {
    // Redirect users to their appropriate dashboard based on role
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'agent') {
      return <Navigate to="/agent/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
