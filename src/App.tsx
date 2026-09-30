import { useState } from 'react';
import { BoardPage } from './pages/BoardPage';
import { SplashScreen } from './components/SplashScreen';

export function App() {
  const [ready, setReady] = useState(false);

  return (
    <>
      {!ready && <SplashScreen onDone={() => setReady(true)} />}
      <BoardPage />
    </>
  );
}
