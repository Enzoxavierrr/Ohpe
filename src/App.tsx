import { useState } from 'react';
import { BoardPage } from './pages/BoardPage';
import { LoginPage } from './pages/LoginPage';
import { ConfigErrorPage } from './pages/ConfigErrorPage';
import { SplashScreen } from './components/SplashScreen';
import { useAuth } from './hooks/useAuth';
import { supabaseConfigured, missingEnvVars } from './lib/supabase';

export function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!supabaseConfigured) {
    return (
      <>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        {splashDone && <ConfigErrorPage missing={missingEnvVars} />}
      </>
    );
  }

  return <AuthenticatedApp splashDone={splashDone} onSplashDone={() => setSplashDone(true)} />;
}

function AuthenticatedApp({ splashDone, onSplashDone }: { splashDone: boolean; onSplashDone: () => void }) {
  const { user, loading } = useAuth();

  return (
    <>
      {!splashDone && <SplashScreen onDone={onSplashDone} />}
      {splashDone && (loading ? null : user ? <BoardPage /> : <LoginPage />)}
    </>
  );
}
