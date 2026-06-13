import { assertSupabaseConfigured, supabase } from './supabaseClient';

export type LoggedUser = {
  id: string;
  username: string;
  bakeryName: string | null;
};

type LoginAppUserResponse = {
  user_id: string;
  user_username: string;
  user_bakery_name: string | null;
};

const sessionKey = 'order-manager-user';

function saveCurrentAppUser(user: LoggedUser) {
  localStorage.setItem(sessionKey, JSON.stringify(user));
}

export async function getCurrentAppUser(): Promise<LoggedUser | null> {
  const savedUser = localStorage.getItem(sessionKey);

  if (!savedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(savedUser) as Partial<LoggedUser>;

    if (parsedUser.id && parsedUser.username) {
      return {
        id: parsedUser.id,
        username: parsedUser.username,
        bakeryName: parsedUser.bakeryName ?? null,
      };
    }
  } catch {
    localStorage.removeItem(sessionKey);
  }

  return null;
}

export async function loginAppUser(username: string, password: string): Promise<LoggedUser> {
  assertSupabaseConfigured();

  const cleanUsername = username.trim();

  if (!cleanUsername || !password) {
    throw new Error('Preencha o utilizador e a palavra-passe.');
  }

  const { data, error } = await supabase.rpc('login_app_user', {
    p_username: cleanUsername,
    p_password: password,
  });

  if (error) {
    throw new Error(error.message || 'Nao foi possivel iniciar sessao.');
  }

  const user = Array.isArray(data) ? (data[0] as LoginAppUserResponse | undefined) : undefined;

  if (!user) {
    throw new Error('Utilizador ou palavra-passe incorretos.');
  }

  const loggedUser = {
    id: user.user_id,
    username: user.user_username,
    bakeryName: user.user_bakery_name,
  };

  saveCurrentAppUser(loggedUser);

  return loggedUser;
}

export async function logoutAppUser() {
  localStorage.removeItem(sessionKey);
}
