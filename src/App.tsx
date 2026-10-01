import { useState } from 'react';
import { BoardPage } from './pages/BoardPage';
import { LoginPage } from './pages/LoginPage';
import { SplashScreen } from './components/SplashScreen';
import { useAuth } from './hooks/useAuth';

export function App() {
  const [splashDone, setSplashDone] = useState(false);
  const { user, loading } = useAuth();

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      {splashDone && (loading ? null : user ? <BoardPage /> : <LoginPage />)}
    </>
  );
}
