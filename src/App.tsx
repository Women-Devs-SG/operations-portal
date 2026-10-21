import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { clearPassword, getPassword, getTasks, setPassword } from './api';
import ProtectedRoute from './components/ProtectedRoute';
import EventsPage from './pages/EventsPage';
import TaskCreatePage from './pages/TaskCreatePage';
import UnlockPage from './pages/UnlockPage';
import type { LoadTasksResult, PortalView, Task, TaskInput, UnlockResult } from './types';
import { useEventCreation } from './useEventCreation';

const emptyInput: TaskInput = {
  taskName: '',
  formUrl: '',
  eventDate: '',
  eventLocation: '',
  eventOneLiner: '',
};

export default function App() {
  const navigate = useNavigate();
  const [view, setView] = useState<PortalView>('checking');
  const [gateError, setGateError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listMessage, setListMessage] = useState('Loading tasks…');
  const initialSessionCheck = useRef<Promise<LoadTasksResult> | null>(null);
  // Drafts live above the routes so an authentication redirect keeps them.
  const [input, setInput] = useState<TaskInput>(emptyInput);

  const lock = useCallback((message: string) => {
    clearPassword();
    setGateError(message);
    setView('locked');
  }, []);

  const showGateError = useCallback((message: string) => {
    setGateError(message);
    setView('locked');
  }, []);

  const loadTasks = useCallback(async (passwordOverride?: string): Promise<LoadTasksResult> => {
    setListMessage('Loading tasks…');
    try {
      const { response, data } = await getTasks(passwordOverride);
      if (response.status === 401) {
        setDemoMode(false);
        setTasks([]);
        setListMessage('');
        return { kind: 'unauthorized', message: 'Incorrect password.' };
      }
      if (!response.ok || data?.status !== 'success') {
        const message = data?.message ?? 'Error loading task database.';
        setTasks([]);
        setDemoMode(false);
        setListMessage(message);
        return { kind: 'server-error', message };
      }
      const newestFirst = [...(data.tasks ?? [])].reverse();
      setDemoMode(data.demoMode === true);
      setTasks(newestFirst);
      setListMessage(newestFirst.length ? '' : 'No tasks created yet.');
      return { kind: 'success' };
    } catch {
      const message = 'Could not reach the portal. Check your connection and try again.';
      setTasks([]);
      setDemoMode(false);
      setListMessage(message);
      return { kind: 'network-error', message };
    }
  }, []);

  useEffect(() => {
    const password = getPassword();
    let active = true;
    initialSessionCheck.current ??= loadTasks(password);
    void initialSessionCheck.current.then((result) => {
      if (!active) return;
      if (result.kind === 'success') {
        setView('portal');
      } else if (result.kind === 'unauthorized') {
        lock(password ? result.message : '');
      } else {
        showGateError(result.message);
      }
    });
    return () => {
      active = false;
    };
  }, [loadTasks, lock, showGateError]);

  async function handleUnlock(password: string): Promise<UnlockResult> {
    setGateError('');
    const result = await loadTasks(password);
    if (result.kind === 'success') {
      setPassword(password);
      setView('portal');
      navigate('/', { replace: true });
      return 'success';
    } else if (result.kind === 'unauthorized') {
      lock(result.message);
      return 'unauthorized';
    } else {
      showGateError(result.message);
      return 'error';
    }
  }

  function handleSessionExpired(message = 'Session expired. Enter the portal password again.') {
    lock(message);
    navigate('/unlock', { replace: true });
  }

  async function handleCreated(): Promise<boolean> {
    setInput(emptyInput);
    const result = await loadTasks();
    if (result.kind === 'unauthorized') handleSessionExpired();
    return result.kind === 'success';
  }

  const { submit, status, submitting, clearSuccess } = useEventCreation(
    handleCreated,
    handleSessionExpired,
  );

  const update = (field: keyof TaskInput, value: string) => {
    clearSuccess();
    setInput((current) => ({ ...current, [field]: value }));
  };

  return (
    <Routes>
      <Route
        path="/unlock"
        element={
          view === 'portal' ? (
            <Navigate to="/" replace />
          ) : (
            <UnlockPage checking={view === 'checking'} error={gateError} onUnlock={handleUnlock} />
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute view={view}>
            <EventsPage
              demoMode={demoMode}
              listMessage={listMessage}
              onCreateEvent={() => navigate('/create-task')}
              tasks={tasks}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-task"
        element={
          <ProtectedRoute view={view}>
            <TaskCreatePage
              demoMode={demoMode}
              input={input}
              onBack={() => navigate('/')}
              onLeave={clearSuccess}
              onChange={update}
              onSubmit={submit}
              status={status}
              submitting={submitting}
            />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
