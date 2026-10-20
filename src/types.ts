export interface Task {
  taskId: string;
  taskName: string;
  status: string;
  driveUrl: string;
  qrUrl: string;
  createdAt: string;
  eventDate: string;
  eventLocation: string;
  eventOneLiner: string;
}

export interface TaskInput {
  taskName: string;
  formUrl: string;
  eventDate: string;
  eventLocation: string;
  eventOneLiner: string;
}

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
}

export type FormStatus = { kind: 'success' | 'error'; message: string } | null;

export type PortalView = 'checking' | 'locked' | 'portal';
export type UnlockResult = 'success' | 'unauthorized' | 'error';

export type LoadTasksResult =
  | { kind: 'success' }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'server-error'; message: string }
  | { kind: 'network-error'; message: string };

export interface TasksResponse extends ApiResponse {
  demoMode: boolean;
  tasks?: Task[];
}
