import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePathname, navigate } from '../hooks/usePathname';
import { supabaseConfigured, missingEnvVars } from '../lib/supabase';
import { SplashScreen } from '../components/SplashScreen';
import { LoginPage } from '../pages/LoginPage';
import { ConfigErrorPage } from '../pages/ConfigErrorPage';
import { DocumentsHome } from './pages/DocumentsHome';
import { DocumentPage } from './pages/DocumentPage';
import { useDocuments } from './hooks/useDocuments';
import '../styles/home.css';
import './styles/documentos.css';

export function DocumentsApp() {
  const [splashDone, setSplashDone] = useState(false);

  if (!supabaseConfigured) {
    return (
      <>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        {splashDone && <ConfigErrorPage missing={missingEnvVars} />}
      </>
    );
  }

  return <AuthedDocsApp splashDone={splashDone} onSplashDone={() => setSplashDone(true)} />;
}

function AuthedDocsApp({ splashDone, onSplashDone }: { splashDone: boolean; onSplashDone: () => void }) {
  const { user, loading } = useAuth();
  return (
    <>
      {!splashDone && <SplashScreen onDone={onSplashDone} />}
      {splashDone && (loading ? null : user ? <DocsRouter userId={user.id} /> : <LoginPage />)}
    </>
  );
}

function DocsRouter({ userId }: { userId: string }) {
  const pathname = usePathname();
  const docs = useDocuments(userId);

  const idMatch = pathname.match(/^\/documentos\/([^/?#]+)/);
  const activeId = idMatch?.[1] ?? null;

  if (activeId) {
    const current = docs.getById(activeId);
    if (!current) {
      if (docs.hydrated) {
        navigate('/documentos');
      }
      return null;
    }
    return (
      <div className="view-transition">
        <DocumentPage
          document={current}
          syncing={docs.syncing}
          onUpdate={(updater) => docs.update(current.id, updater)}
          onRename={(name) => docs.rename(current.id, name)}
          onDelete={() => {
            docs.remove(current.id);
            navigate('/documentos');
          }}
          onBack={() => navigate('/documentos')}
        />
      </div>
    );
  }

  return (
    <div className="view-transition">
      <DocumentsHome
        documents={docs.documents}
        groups={docs.groups}
        syncing={docs.syncing}
        onOpen={(id) => navigate('/documentos/' + id)}
        onCreate={(seed) => {
          const id = docs.create(seed);
          navigate('/documentos/' + id);
        }}
        onRename={docs.rename}
        onDelete={docs.remove}
        onMoveToGroup={docs.moveToGroup}
        onCreateGroup={docs.createGroup}
        onRenameGroup={docs.renameGroup}
        onRemoveGroup={docs.removeGroup}
      />
    </div>
  );
}
