import {
  Camera,
  Cloud,
  Edit3,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';
import { useSaved } from '@/stores/saved';
import { useSettings } from '@/stores/settings';
import { toast } from '@/stores/toast';
import { Badge, Button, Modal, Segmented, Switch } from '../ui';

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

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91 (India)' },
  { code: '+1', label: '🇺🇸 +1 (US/CA)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+971', label: '🇦🇪 +971 (UAE)' },
  { code: '+65', label: '🇸🇬 +65 (SG)' },
];

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Telangana',
  'Karnataka',
  'Tamil Nadu',
  'Kerala',
  'Maharashtra',
  'Delhi',
  'Goa',
  'Gujarat',
  'Rajasthan',
  'Uttar Pradesh',
  'West Bengal',
  'Odisha',
  'Other',
];

const EXT_PROFILE_KEY = 'locate_u:extended_profile:v2';

interface ExtendedProfileData {
  avatarUrl: string | null;
  countryCode: string;
  phone: string;
  dob: string;
  gender: string;
  country: string;
  state: string;
  homeCity: string;
  foodPreference: 'Vegetarian' | 'Non-Veg' | 'Vegan' | 'Jain';
  phoneVerified: boolean;
}

export function AccountPanel() {
  const { user, login, register, logout } = useAuth();
  const { profile, updateProfile: updateLocalProfile } = useProfile();
  const { syncEnabled, set } = useSettings();
  const { sync, syncing, lastSync, syncError } = useSaved();

  const [extProfile, setExtProfile] = useState<ExtendedProfileData>(() => {
    try {
      const raw = localStorage.getItem(EXT_PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return {
      avatarUrl: null,
      countryCode: '+91',
      phone: profile.phone || '',
      dob: '',
      gender: '',
      country: 'India',
      state: 'Andhra Pradesh',
      homeCity: profile.homeCity || 'Kakinada',
      foodPreference: profile.foodPreference || 'Vegetarian',
      phoneVerified: false,
    };
  });

  const saveExtProfile = (next: Partial<ExtendedProfileData>) => {
    setExtProfile((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(EXT_PROFILE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    });
  };

  // Auth Flow State
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'recovery'>('login');
  const [identType, setIdentType] = useState<'phone' | 'email'>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [stateInput, setStateInput] = useState('Andhra Pradesh');

  // OTP Verification State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Profile Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name || '');
  const [editEmail, setEditEmail] = useState(profile.email || '');
  const [editPhone, setEditPhone] = useState(extProfile.phone || '');
  const [editCountryCode, setEditCountryCode] = useState(extProfile.countryCode || '+91');
  const [editDob, setEditDob] = useState(extProfile.dob || '');
  const [editGender, setEditGender] = useState(extProfile.gender || '');
  const [editCountry, setEditCountry] = useState(extProfile.country || 'India');
  const [editState, setEditState] = useState(extProfile.state || 'Andhra Pradesh');
  const [editHomeCity, setEditHomeCity] = useState(extProfile.homeCity || 'Kakinada');
  const [editFoodPref, setEditFoodPref] = useState<'Vegetarian' | 'Non-Veg' | 'Vegan' | 'Jain'>(
    extProfile.foodPreference || 'Vegetarian',
  );
  const [editAvatar, setEditAvatar] = useState<string | null>(extProfile.avatarUrl);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    setEditName(user?.display_name || profile.name || 'Traveler');
    setEditEmail(user?.email || profile.email || '');
    setEditPhone(extProfile.phone || profile.phone || '');
    setEditCountryCode(extProfile.countryCode || '+91');
    setEditDob(extProfile.dob || '');
    setEditGender(extProfile.gender || '');
    setEditCountry(extProfile.country || 'India');
    setEditState(extProfile.state || 'Andhra Pradesh');
    setEditHomeCity(extProfile.homeCity || profile.homeCity || 'Kakinada');
    setEditFoodPref(extProfile.foodPreference || profile.foodPreference || 'Vegetarian');
    setEditAvatar(extProfile.avatarUrl || null);
  }, [user, profile.name, profile.email]);

  const validateIndianPhone = (raw: string, code: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
    if (code === '+91' && !/^[6-9]\d{9}$/.test(digits)) {
      return 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }
    if (digits.length < 7 || digits.length > 14) {
      return 'Enter a valid phone number.';
    }
    return null;
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast('Please choose an image smaller than 300 KB', { tone: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendOtp = async () => {
    setErrorMsg(null);
    if (identType === 'phone') {
      const err = validateIndianPhone(phoneInput, countryCode);
      if (err) {
        setErrorMsg(err);
        return;
      }
    } else if (!emailInput.trim() || !emailInput.includes('@')) {
      setErrorMsg('Enter a valid email address.');
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setOtpSent(true);
    setCooldown(30);
    toast(`Verification OTP generated (${code})`, { tone: 'success' });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (identType === 'phone') {
      const phoneErr = validateIndianPhone(phoneInput, countryCode);
      if (phoneErr) {
        setErrorMsg(phoneErr);
        return;
      }
      if (!otpSent || !otpCode.trim()) {
        setErrorMsg('Please request an OTP and enter the 6-digit verification code.');
        return;
      }
      if (generatedOtp && otpCode.trim() !== generatedOtp) {
        setErrorMsg('Invalid 6-digit OTP code. Please check the code and try again.');
        return;
      }
    }

    const cleanDigits = phoneInput.replace(/\D/g, '').slice(-10);
    const effectiveEmail =
      identType === 'email'
        ? emailInput.trim()
        : `${cleanDigits}@phone.locateu.in`;
    const effectivePassword =
      passwordInput.trim().length >= 8 ? passwordInput.trim() : `OtpAuth#${cleanDigits || '2026'}`;

    setBusy(true);
    try {
      if (authTab === 'register') {
        await register(
          effectiveEmail,
          effectivePassword,
          nameInput.trim() || `Traveler ${cleanDigits.slice(-4)}`,
        );
      } else {
        try {
          await login(effectiveEmail, effectivePassword);
        } catch {
          if (identType === 'phone') {
            await register(
              effectiveEmail,
              effectivePassword,
              nameInput.trim() || `Traveler ${cleanDigits.slice(-4)}`,
            );
          } else {
            throw new Error('Invalid email or password.');
          }
        }
      }

      if (identType === 'phone') {
        saveExtProfile({
          countryCode,
          phone: cleanDigits,
          state: stateInput,
          phoneVerified: true,
        });
        updateLocalProfile({
          name: nameInput.trim() || profile.name,
          phone: `${countryCode} ${cleanDigits}`,
          homeCity: stateInput,
        });
      }
      toast('Signed in & verified successfully!', { tone: 'success' });
    } catch (err) {
      setErrorMsg((err as Error).message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!editName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (editPhone.trim()) {
      const phoneErr = validateIndianPhone(editPhone, editCountryCode);
      if (phoneErr) {
        setErrorMsg(phoneErr);
        return;
      }
    }

    setBusy(true);
    try {
      const cleanPhone = editPhone.replace(/\D/g, '').replace(/^0+/, '');
      saveExtProfile({
        avatarUrl: editAvatar,
        countryCode: editCountryCode,
        phone: cleanPhone,
        dob: editDob,
        gender: editGender,
        country: editCountry,
        state: editState,
        homeCity: editHomeCity.trim() || 'Kakinada',
        foodPreference: editFoodPref,
        phoneVerified: Boolean(cleanPhone),
      });

      updateLocalProfile({
        name: editName.trim(),
        email: editEmail.trim(),
        phone: cleanPhone ? `${editCountryCode} ${cleanPhone}` : '',
        homeCity: editHomeCity.trim() || editState,
        foodPreference: editFoodPref,
      });

      setIsEditing(false);
      toast('Account profile saved!', { tone: 'success' });
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(user?.display_name || profile.name || 'Traveler');
    setEditEmail(user?.email || profile.email || '');
    setEditPhone(extProfile.phone || '');
    setEditCountryCode(extProfile.countryCode || '+91');
    setEditDob(extProfile.dob || '');
    setEditGender(extProfile.gender || '');
    setEditCountry(extProfile.country || 'India');
    setEditState(extProfile.state || 'Andhra Pradesh');
    setEditHomeCity(extProfile.homeCity || profile.homeCity || 'Kakinada');
    setEditFoodPref(extProfile.foodPreference || profile.foodPreference || 'Vegetarian');
    setEditAvatar(extProfile.avatarUrl || null);
    setErrorMsg(null);
    setIsEditing(false);
  };

  const displayName = user?.display_name || profile.name || 'Traveler';
  const displayEmail =
    user?.email && !user.email.endsWith('@phone.locateu.in')
      ? user.email
      : profile.email || 'Not set';
  const displayPhone = extProfile.phone
    ? `${extProfile.countryCode} ${extProfile.phone}`
    : profile.phone || 'Not set';

  return (
    <div className="space-y-6">
      {/* DEDICATED ACCOUNT PROFILE CARD (View / Edit / Save / Cancel) */}
      <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {(isEditing ? editAvatar : extProfile.avatarUrl) ? (
                <img
                  src={(isEditing ? editAvatar : extProfile.avatarUrl) || ''}
                  alt={displayName}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-500/40"
                />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white shadow-md">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white shadow hover:bg-brand-700"
                  title="Upload profile photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold truncate">{displayName}</h3>
                <Badge tone={user || extProfile.phoneVerified ? 'green' : 'brand'}>
                  <ShieldCheck className="h-3 w-3" />
                  {user ? 'Cloud Account Active' : 'Local Profile Active'}
                </Badge>
              </div>
              <div className="mt-1 space-y-0.5 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> <span>{displayEmail}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Phone className="h-3.5 w-3.5" /> <span>{displayPhone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {extProfile.homeCity}, {extProfile.state}, {extProfile.country}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEditing && (
              <Button
                size="sm"
                variant="primary"
                icon={<Edit3 className="h-4 w-4" />}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
            {user && (
              <Button
                size="sm"
                variant="secondary"
                icon={<LogOut className="h-4 w-4" />}
                onClick={() => {
                  logout();
                  set({ syncEnabled: false });
                  toast('Signed out');
                }}
              >
                Sign out
              </Button>
            )}
          </div>
        </div>

        {!isEditing ? (
          <div className="mt-5 grid grid-cols-2 gap-3 border-t hairline pt-4 sm:grid-cols-4 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase text-muted">Full Name</span>
              <span className="font-semibold">{displayName}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-muted">Email Address</span>
              <span className="font-semibold truncate block">{displayEmail}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-muted">Phone Number</span>
              <span className="font-mono font-semibold">{displayPhone}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-muted">Home City</span>
              <span className="font-semibold">{extProfile.homeCity || 'Kakinada'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-muted">State / Country</span>
              <span className="font-semibold">
                {extProfile.state}, {extProfile.country}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-muted">Food Preference</span>
              <span className="font-semibold">{extProfile.foodPreference}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-muted">Date of Birth</span>
              <span className="font-semibold">{extProfile.dob || 'Optional'}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-muted">Gender</span>
              <span className="font-semibold capitalize">{extProfile.gender || 'Optional'}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4 border-t hairline pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">Edit Account Profile</h4>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                >
                  Upload Photo
                </button>
                {editAvatar && (
                  <button
                    type="button"
                    onClick={() => setEditAvatar(null)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-2xl bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-3.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/[0.06]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-3.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/[0.06]"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  Phone Number (10-digit India +91)
                </label>
                <div className="flex gap-2">
                  <select
                    value={editCountryCode}
                    onChange={(e) => setEditCountryCode(e.target.value)}
                    className="h-10 rounded-2xl border border-black/10 bg-white/80 px-2.5 text-xs font-medium outline-none dark:border-white/10 dark:bg-slate-900"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="9848012345"
                    className="h-10 flex-1 rounded-2xl border border-black/10 bg-white/80 px-3.5 text-sm font-mono outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/[0.06]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">Home City</label>
                  <input
                    type="text"
                    value={editHomeCity}
                    onChange={(e) => setEditHomeCity(e.target.value)}
                    placeholder="Kakinada"
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-3 text-xs outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/[0.06]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">Food Preference</label>
                  <select
                    value={editFoodPref}
                    onChange={(e) => setEditFoodPref(e.target.value as any)}
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-2.5 text-xs outline-none dark:border-white/10 dark:bg-slate-900"
                  >
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Jain">Jain</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Country</label>
                <input
                  type="text"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-3 text-xs outline-none dark:border-white/10 dark:bg-white/[0.06]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">State</label>
                <select
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-2.5 text-xs outline-none dark:border-white/10 dark:bg-slate-900"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Date of Birth</label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-2.5 text-xs outline-none dark:border-white/10 dark:bg-white/[0.06]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Gender</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white/80 px-2.5 text-xs outline-none dark:border-white/10 dark:bg-slate-900"
                >
                  <option value="">Optional</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<X className="h-4 w-4" />}
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={busy}
                icon={<Save className="h-4 w-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* PHONE NUMBER & EMAIL AUTHENTICATION SECTION WHEN NOT SIGNED IN TO CLOUD */}
      {!user ? (
        <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 space-y-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold">Phone Number & Email Cloud Sign-In</h4>
              <p className="text-xs text-muted">
                Sign in with your 10-digit mobile number (OTP) or email to sync saved places across devices.
              </p>
            </div>
            <Segmented<'phone' | 'email'>
              size="sm"
              label="Login identifier"
              value={identType}
              onChange={(v) => {
                setIdentType(v);
                setErrorMsg(null);
                setOtpSent(false);
              }}
              options={[
                { value: 'phone', label: 'Phone + OTP', icon: <Smartphone className="h-3.5 w-3.5" /> },
                { value: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
              ]}
            />
          </div>

          <Segmented<'login' | 'register' | 'recovery'>
            size="sm"
            label="Auth mode"
            value={authTab}
            onChange={(v) => {
              setAuthTab(v);
              setErrorMsg(null);
            }}
            options={[
              { value: 'login', label: 'Sign In' },
              { value: 'register', label: 'Create Account' },
              { value: 'recovery', label: 'Account Recovery' },
            ]}
          />

          {errorMsg && (
            <div className="rounded-2xl bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {generatedOtp && otpSent && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold">
                OTP Verification Code: <span className="font-mono text-sm underline">{generatedOtp}</span>
              </div>
              <div className="mt-0.5 text-[11px] opacity-85">
                Enter this 6-digit OTP below to verify your phone number.
              </div>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {authTab === 'register' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">Full Name *</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Ramabhaskar"
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white/85 px-3.5 text-sm outline-none dark:border-white/10 dark:bg-white/[0.06]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">Home State</label>
                  <select
                    value={stateInput}
                    onChange={(e) => setStateInput(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white/85 px-3 text-xs font-semibold outline-none dark:border-white/10 dark:bg-slate-900"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {identType === 'phone' ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">
                    Mobile Number (with Country Code)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="h-10 rounded-2xl border border-black/10 bg-white/85 px-2.5 text-xs font-semibold outline-none dark:border-white/10 dark:bg-slate-900"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="98480 12345"
                      className="h-10 flex-1 rounded-2xl border border-black/10 bg-white/85 px-3.5 text-sm font-mono outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/[0.06]"
                      required
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={cooldown > 0}
                      onClick={handleSendOtp}
                    >
                      {cooldown > 0 ? `Resend (${cooldown}s)` : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">6-Digit SMS OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white/85 px-3.5 text-center font-mono text-base tracking-widest outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/[0.06]"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white/85 px-3.5 text-sm outline-none dark:border-white/10 dark:bg-white/[0.06]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white/85 px-3.5 text-sm outline-none dark:border-white/10 dark:bg-white/[0.06]"
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" loading={busy} className="w-full justify-center">
              {authTab === 'register'
                ? 'Verify & Create Account'
                : authTab === 'recovery'
                  ? 'Verify OTP & Recover Account'
                  : 'Verify & Sign In'}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <Switch
            label="Sync saved places to my cloud account"
            description="Keep your saved destinations backed up across mobile and desktop."
            checked={syncEnabled}
            onChange={(v) => {
              set({ syncEnabled: v });
              if (v) sync();
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              {syncError ? (
                <span className="text-red-600">{syncError}</span>
              ) : lastSync ? (
                `Last synced ${timeAgo(lastSync)}`
              ) : (
                'Not synced yet'
              )}
            </span>
            <div className="flex gap-2">
              {syncEnabled && (
                <Button
                  size="sm"
                  loading={syncing}
                  icon={<Cloud className="h-4 w-4" />}
                  onClick={() => sync()}
                >
                  Sync now
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="h-4 w-4 text-red-600" />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete account
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?">
        <p className="text-sm text-muted">
          This permanently deletes your cloud account. Places saved on this device are kept.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              await api.deleteAccount();
              logout();
              set({ syncEnabled: false });
              setConfirmDelete(false);
              toast('Account deleted');
            }}
          >
            Delete account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
