import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const missingEnvVars: string[] = [];
if (!url) missingEnvVars.push('VITE_SUPABASE_URL');
if (!anonKey) missingEnvVars.push('VITE_SUPABASE_ANON_KEY');

// Cria um client real se tiver as credenciais; caso contrário, exporta um stub
// que lança erro só quando efetivamente for usado — assim o app monta e mostra
// a mensagem de setup em vez de ficar com tela branca.
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : (new Proxy({}, {
      get() {
        throw new Error(
          'Supabase não configurado: defina ' + missingEnvVars.join(' e ') + '.',
        );
      },
    }) as unknown as SupabaseClient);
