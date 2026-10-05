import { useCallback, useState } from 'react';
import { BoardPage } from './pages/BoardPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ConfigErrorPage } from './pages/ConfigErrorPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SplashScreen } from './components/SplashScreen';
import { useAuth } from './hooks/useAuth';
import { useWorkspace } from './hooks/useBoard';
import { usePathname } from './hooks/usePathname';
import { supabaseConfigured, missingEnvVars } from './lib/supabase';
import { DocumentsApp } from './documentos/DocumentsApp';
import type { Board } from './types/board';

function isKnownRoute(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' || path === '/index.html' || path.startsWith('/documentos');
}

export function App() {
  const pathname = usePathname();
  const [splashDone, setSplashDone] = useState(false);

  if (pathname.startsWith('/documentos')) {
    return <DocumentsApp />;
  }

  if (!isKnownRoute(pathname)) {
    return <NotFoundPage />;
  }

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
      {splashDone && (loading ? null : user ? <WorkspaceRouter userId={user.id} /> : <LoginPage />)}
    </>
  );
}

type RouterView =
  | { kind: 'home' }
  | { kind: 'board'; id: string };

function WorkspaceRouter({ userId }: { userId: string }) {
  const {
    workspace, syncing,
    createBoard, renameBoard, deleteBoard, updateBoard,
  } = useWorkspace(userId);

  const [view, setView] = useState<RouterView>({ kind: 'home' });
  const [transitionKey, setTransitionKey] = useState(0);
  const [transitionDir, setTransitionDir] = useState<'forward' | 'backward'>('forward');

  const openBoard = useCallback((id: string) => {
    setTransitionDir('forward');
    setView({ kind: 'board', id });
    setTransitionKey((k) => k + 1);
  }, []);

  const backToHome = useCallback(() => {
    setTransitionDir('backward');
    setView({ kind: 'home' });
    setTransitionKey((k) => k + 1);
  }, []);

  // Se o board selecionado sumir (deletado), volta pra home
  if (view.kind === 'board' && !workspace.boards[view.id]) {
    return (
      <HomePage
        workspace={workspace}
        syncing={syncing}
        onOpenBoard={openBoard}
        onCreateBoard={createBoard}
        onRenameBoard={renameBoard}
        onDeleteBoard={deleteBoard}
      />
    );
  }

  const setActiveBoard = (updater: (prev: Board) => Board) => {
    if (view.kind !== 'board') return;
    updateBoard(view.id, updater);
  };

  const activeBoard = view.kind === 'board' ? workspace.boards[view.id] : null;
  const activeName = view.kind === 'board' ? workspace.meta[view.id]?.name ?? 'Board' : '';

  return (
    <div
      key={transitionKey}
      className={`view-transition view-transition--${transitionDir}`}
    >
      {view.kind === 'home' ? (
        <HomePage
          workspace={workspace}
          syncing={syncing}
          onOpenBoard={openBoard}
          onCreateBoard={createBoard}
          onRenameBoard={renameBoard}
          onDeleteBoard={deleteBoard}
        />
      ) : activeBoard ? (
        <BoardPage
          board={activeBoard}
          setBoard={setActiveBoard}
          syncing={syncing}
          boardName={activeName}
          onBack={backToHome}
        />
      ) : null}
    </div>
  );
}
