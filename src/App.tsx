import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { clearPassword, getPassword, getTasks, setPassword } from './api';
import EventsPage from './pages/EventsPage';
import TaskCreatePage from './pages/TaskCreatePage';
import UnlockPage from './pages/UnlockPage';
import type { LoadTasksResult, Task } from './types';

type View = 'checking' | 'locked' | 'portal';
type UnlockResult = 'success' | 'unauthorized' | 'error';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('checking');
  const [gateError, setGateError] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listMessage, setListMessage] = useState('Loading tasks…');

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
    if (!getPassword()) {
      setView('locked');
      if (location.pathname !== '/unlock') {
        navigate('/unlock', { replace: true });
      }
      return;
    }

    void loadTasks(getPassword()).then((result) => {
      if (result.kind === 'success') {
        setView('portal');
        if (location.pathname === '/unlock') {
          navigate('/', { replace: true });
        }
      } else if (result.kind === 'unauthorized') {
        lock(result.message);
        navigate('/unlock', { replace: true });
      } else {
        showGateError(result.message);
        navigate('/unlock', { replace: true });
      }
    });
  }, [loadTasks, lock, location.pathname, navigate, showGateError]);

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
        element={<UnlockPage checking={view === 'checking'} error={gateError} onUnlock={handleUnlock} />}
      />
      <Route
        path="/"
        element={view === 'portal' ? <EventsPage listMessage={listMessage} onCreateEvent={() => navigate('/create-task')} tasks={tasks} /> : <Navigate to="/unlock" replace />}
      />
      <Route
        path="/create-task"
        element={view === 'portal' ? <TaskCreatePage onEventCreated={() => loadTasks()} onSessionExpired={handleSessionExpired} /> : <Navigate to="/unlock" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
