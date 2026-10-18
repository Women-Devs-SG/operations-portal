import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import type { PortalView } from '../types';

interface ProtectedRouteProps {
  view: PortalView;
  children: ReactNode;
}

export default function ProtectedRoute({ view, children }: ProtectedRouteProps) {
  return view === 'portal' ? children : <Navigate to="/unlock" replace />;
}
