import { useCallback, useEffect, useRef, useState } from 'react';
import { BoardPage } from './pages/BoardPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ConfigErrorPage } from './pages/ConfigErrorPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProtectAccountPage } from './pages/ProtectAccountPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SplashScreen } from './components/SplashScreen';
import { RouteWipeOverlay } from './components/RouteWipeOverlay';
import { useAuth, needsAccountMigration } from './hooks/useAuth';
import { useWorkspace } from './hooks/useBoard';
import { usePathname } from './hooks/usePathname';
import { supabase, supabaseConfigured, missingEnvVars } from './lib/supabase';
import { DocumentsApp } from './documentos/DocumentsApp';
import type { Board } from './types/board';

function isKnownRoute(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' || path === '/index.html' || path.startsWith('/documentos');
}

export function App() {
  const pathname = usePathname();
  const [splashDone, setSplashDone] = useState(false);
  const [wipeKey, setWipeKey] = useState(0);
  const prevSectionRef = useRef(pathname.startsWith('/documentos') ? 'docs' : 'main');
  const [recoveryMode, setRecoveryMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash;
    return hash.includes('type=recovery') || hash.startsWith('#reset');
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Dispara o wipe overlay apenas quando cruza entre / e /documentos.
  useEffect(() => {
    const section = pathname.startsWith('/documentos') ? 'docs' : 'main';
    if (section !== prevSectionRef.current) {
      prevSectionRef.current = section;
      setWipeKey((k) => k + 1);
    }
  }, [pathname]);

  if (recoveryMode) {
    return <ResetPasswordPage onDone={() => setRecoveryMode(false)} />;
  }

  // Splash só no boot — depois disso, nav entre /, /documentos usa o wipe curto.
  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  if (!isKnownRoute(pathname)) {
    return <NotFoundPage />;
  }

  const isDocs = pathname.startsWith('/documentos');
  const wipe = wipeKey > 0 ? <RouteWipeOverlay key={wipeKey} /> : null;

  if (isDocs) {
    return (
      <>
        <DocumentsApp />
        {wipe}
      </>
    );
  }

  if (!supabaseConfigured) {
    return <ConfigErrorPage missing={missingEnvVars} />;
  }

  return (
    <>
      <AuthenticatedApp />
      {wipe}
    </>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [justMigrated, setJustMigrated] = useState(false);

  if (loading) return null;
  if (!user) return <LoginPage />;

  const showMigration = !justMigrated && needsAccountMigration(user);
  if (showMigration) return <ProtectAccountPage onDone={() => setJustMigrated(true)} />;

  return <WorkspaceRouter userId={user.id} />;
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
