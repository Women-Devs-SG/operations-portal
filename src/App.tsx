import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { clearPassword, getPassword, getTasks, setPassword } from './api';
import ProtectedRoute from './components/ProtectedRoute';
import EventsPage from './pages/EventsPage';
import TaskCreatePage from './pages/TaskCreatePage';
import UnlockPage from './pages/UnlockPage';
import type { LoadTasksResult, PortalView, Task, UnlockResult } from './types';

export default function App() {
  const navigate = useNavigate();
  const [view, setView] = useState<PortalView>('checking');
  const [gateError, setGateError] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listMessage, setListMessage] = useState('Loading tasks…');
  const initialSessionCheck = useRef<Promise<LoadTasksResult> | null>(null);

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
        setTasks([]);
        setListMessage('');
        return { kind: 'unauthorized', message: 'Incorrect password.' };
      }
      if (!response.ok || data?.status !== 'success') {
        const message = data?.message ?? 'Error loading task database.';
        setTasks([]);
        setListMessage(message);
        return { kind: 'server-error', message };
      }
      const newestFirst = [...(data.tasks ?? [])].reverse();
      setTasks(newestFirst);
      setListMessage(newestFirst.length ? '' : 'No tasks created yet.');
      return { kind: 'success' };
    } catch {
      const message = 'Could not reach the portal. Check your connection and try again.';
      setTasks([]);
      setListMessage(message);
      return { kind: 'network-error', message };
    }
  }, []);

  useEffect(() => {
    const password = getPassword();
    if (!password) {
      setView('locked');
      return;
    }

    let active = true;
    initialSessionCheck.current ??= loadTasks(password);
    void initialSessionCheck.current.then((result) => {
      if (!active) return;
      if (result.kind === 'success') {
        setView('portal');
      } else if (result.kind === 'unauthorized') {
        lock(result.message);
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

  function handleSessionExpired() {
    lock('Session expired. Enter the portal password again.');
    navigate('/unlock', { replace: true });
  }

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
              onEventCreated={() => loadTasks()}
              onSessionExpired={handleSessionExpired}
            />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
