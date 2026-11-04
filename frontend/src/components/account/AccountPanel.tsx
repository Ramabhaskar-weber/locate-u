import { zodResolver } from '@hookform/resolvers/zod';
import { Cloud, LogOut, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useAuth } from '@/stores/auth';
import { useSaved } from '@/stores/saved';
import { useSettings } from '@/stores/settings';
import { toast } from '@/stores/toast';
import { Button, Input, Modal, Segmented, Switch } from '../ui';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
export const registerSchema = z.object({
  display_name: z.string().trim().min(1, 'Tell us what to call you').max(80),
  email: z.string().trim().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128)
    .refine((v) => !/^\d+$/.test(v) && !/^[a-z]+$/i.test(v), 'Mix letters with numbers or symbols'),
});
type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export function AccountPanel() {
  const { user, logout } = useAuth();
  const { syncEnabled, set } = useSettings();
  const { sync, syncing, lastSync, syncError } = useSaved();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [confirm, setConfirm] = useState(false);

  if (user) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-lg font-bold text-white">{user.display_name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{user.display_name}</div>
            <div className="truncate text-[13px] text-muted">{user.email}</div>
          </div>
          <Button size="sm" icon={<LogOut className="h-4 w-4" />} onClick={() => { logout(); set({ syncEnabled: false }); toast('Signed out'); }}>Sign out</Button>
        </div>
        <Switch
          label="Sync saved places to my account"
          description="Off by default. When on, your saved places (names and coordinates) are stored on the Locate U server so they follow you across devices."
          checked={syncEnabled}
          onChange={(v) => { set({ syncEnabled: v }); if (v) setTimeout(() => useSaved.getState().sync(), 0); }}
        />
        {syncEnabled && (
          <div className="flex items-center justify-between rounded-2xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.04]">
            <span className={syncError ? 'text-red-600' : 'text-muted'}>{syncError ? `Sync failed: ${syncError}` : lastSync ? `Last synced ${timeAgo(lastSync)}` : 'Not synced yet'}</span>
            <Button size="sm" icon={<Cloud className="h-4 w-4" />} loading={syncing} onClick={sync}>Sync now</Button>
          </div>
        )}
        <Button size="sm" variant="ghost" className="text-red-600" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete account</Button>
        <Modal
          open={confirm}
          onClose={() => setConfirm(false)}
          title="Delete your account?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await api.deleteAccount();
                    logout();
                    set({ syncEnabled: false });
                    toast('Account deleted', { description: 'Your server-side data was removed. Places on this device were kept.' });
                  } catch (e) {
                    toast('Could not delete account', { tone: 'error', description: (e as Error).message });
                  }
                  setConfirm(false);
                }}
              >
                Delete permanently
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">This permanently deletes your account and every saved place stored on the server. Places on this device are kept.</p>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        <UserRound className="mr-1 inline h-4 w-4" />
        An account is optional. Everything works without one; signing in only enables syncing saved places between devices.
      </p>
      <Segmented label="Account mode" value={mode} onChange={setMode} options={[{ value: 'login', label: 'Sign in' }, { value: 'register', label: 'Create account' }]} />
      {mode === 'login' ? <LoginFormView /> : <RegisterFormView />}
    </div>
  );
}

function LoginFormView() {
  const login = useAuth((s) => s.login);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit(async (v) => {
        setErr(null);
        try {
          await login(v.email, v.password);
          toast('Welcome back', { tone: 'success' });
        } catch (e) {
          setErr((e as Error).message);
        }
      })}
    >
      <Input label="Email" type="email" autoComplete="email" {...register('email')} error={formState.errors.email?.message} />
      <Input label="Password" type="password" autoComplete="current-password" {...register('password')} error={formState.errors.password?.message} />
      {err && <p role="alert" className="text-[13px] text-red-600">{err}</p>}
      <Button type="submit" variant="primary" loading={formState.isSubmitting} className="w-full">Sign in</Button>
    </form>
  );
}

function RegisterFormView() {
  const reg = useAuth((s) => s.register);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit(async (v) => {
        setErr(null);
        try {
          await reg(v.email, v.password, v.display_name);
          toast('Account created', { tone: 'success', description: 'Turn on sync to back up your saved places.' });
        } catch (e) {
          setErr((e as Error).message);
        }
      })}
    >
      <Input label="Name" autoComplete="nickname" {...register('display_name')} error={formState.errors.display_name?.message} />
      <Input label="Email" type="email" autoComplete="email" {...register('email')} error={formState.errors.email?.message} />
      <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters, mixing letters and numbers or symbols. Stored only as a salted scrypt hash." {...register('password')} error={formState.errors.password?.message} />
      {err && <p role="alert" className="text-[13px] text-red-600">{err}</p>}
      <Button type="submit" variant="primary" loading={formState.isSubmitting} className="w-full">Create account</Button>
    </form>
  );
}
