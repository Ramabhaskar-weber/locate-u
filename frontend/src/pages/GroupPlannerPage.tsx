import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Wallet,
  Plus,
  Trash2,
  Copy,
  Check,
  UserCheck,
  Sparkles,
  Save,
  UserPlus,
  Phone,
  MessageCircle,
  LogIn,
  X,
} from 'lucide-react';
import { Badge, Card, Glass, Segmented } from '@/components/ui';
import { copyText } from '@/hooks';
import { useProfile, type WalletExpense } from '@/stores/profile';
import { toast } from '@/stores/toast';

type Tab = 'wallet' | 'group' | 'profile';

const QUICK_FAMILY_ROLES = [
  { label: '+ Father (నాన్న)', name: 'Father', relation: 'Father' },
  { label: '+ Mother (అమ్మ)', name: 'Mother', relation: 'Mother' },
  { label: '+ Brother (అన్నయ్య)', name: 'Brother', relation: 'Brother' },
  { label: '+ Sister', name: 'Sister', relation: 'Sister' },
  { label: '+ Cousin / Friend', name: 'Cousin', relation: 'Family' },
];

export default function GroupPlannerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    profile,
    updateProfile,
    expenses,
    addExpense,
    removeExpense,
    clearExpenses,
    currentTrip,
    createGroupTrip,
    joinGroupTrip,
    addTripMember,
    removeTripMember,
    addTripNote,
    removeTripNote,
    leaveTrip,
  } = useProfile();

  const [tab, setTab] = useState<Tab>('group');
  const [copied, setCopied] = useState(false);

  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<WalletExpense['category']>('Food');
  const [expPayer, setExpPayer] = useState(profile.name || 'Self');

  const [tripName, setTripName] = useState('Tirupati Family Darshanam');
  const [tripDest, setTripDest] = useState('Tirupati & Tirumala');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinTripNameInput, setJoinTripNameInput] = useState('');

  const [memberInput, setMemberInput] = useState('');
  const [memberRelation, setMemberRelation] = useState('Family');
  const [memberPhone, setMemberPhone] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const [profName, setProfName] = useState(profile.name);
  const [profEmail, setProfEmail] = useState(profile.email);
  const [profCity, setProfCity] = useState(profile.homeCity);
  const [profFood, setProfFood] = useState(profile.foodPreference);
  const [profStyle, setProfStyle] = useState(profile.travelStyle);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    const roomParam = searchParams.get('room');
    if (roomParam) {
      const tName = searchParams.get('trip') || 'Shared Family Trip';
      const tDest = searchParams.get('dest') || 'India';
      const memParam = searchParams.get('members');
      const memList = memParam ? memParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
      joinGroupTrip(roomParam, tName, tDest, memList);
      setTab('group');
      toast(`Joined Group Travel Room ${roomParam}!`, { tone: 'success' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, joinGroupTrip, setSearchParams]);

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const activeMembers = currentTrip?.members?.length ? currentTrip.members : [profile.name || 'Self'];
  const memberCount = Math.max(1, activeMembers.length);
  const perPersonCost = Math.round(totalSpend / memberCount);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount) return;
    const amt = parseFloat(expAmount);
    if (Number.isNaN(amt) || amt <= 0) return;
    addExpense({
      title: expTitle.trim(),
      amount: amt,
      category: expCategory,
      paidBy: expPayer || profile.name || 'Self',
    });
    setExpTitle('');
    setExpAmount('');
    toast('Expense added to Travel Wallet!', { tone: 'success' });
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const code = createGroupTrip(tripName, tripDest, [profile.name || 'Self']);
    toast(`Group Room ${code} created! Add your family members below.`, { tone: 'success' });
  };

  const handleJoinExistingRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    joinGroupTrip(
      joinCodeInput.trim().toUpperCase(),
      joinTripNameInput.trim() || 'Family & Friends Group Trip',
      tripDest || 'Shared Trip',
    );
    setJoinCodeInput('');
    toast('Joined Group Travel Room!', { tone: 'success' });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = memberInput.trim();
    if (!cleanName) {
      toast('Please enter a family member or friend name first.', { tone: 'error' });
      return;
    }
    if (currentTrip?.members.some((m) => m.toLowerCase() === cleanName.toLowerCase())) {
      toast(`${cleanName} is already in this Group Room!`, { tone: 'info' });
      return;
    }
    addTripMember(cleanName, memberRelation, memberPhone, '');
    setMemberInput('');
    setMemberPhone('');
    toast(`${cleanName} added to your Group Travel Room!`, { tone: 'success' });
  };

  const handleQuickAddRole = (roleName: string, relation: string) => {
    if (!currentTrip) return;
    if (currentTrip.members.some((m) => m.toLowerCase() === roleName.toLowerCase())) {
      toast(`${roleName} is already in the group. Type a specific name below to add another.`, { tone: 'info' });
      return;
    }
    addTripMember(roleName, relation);
    toast(`${roleName} added to your Group Travel Room!`, { tone: 'success' });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addTripNote(noteInput.trim());
    setNoteInput('');
    toast('Shared note added!', { tone: 'success' });
  };

  const buildShareLink = () => {
    if (!currentTrip) return 'https://locate-u.onrender.com/planner';
    const params = new URLSearchParams({
      room: currentTrip.roomCode,
      trip: currentTrip.tripName,
      dest: currentTrip.destination,
      members: currentTrip.members.join(','),
    });
    return `https://locate-u.onrender.com/planner?${params.toString()}`;
  };

  const buildInviteMessage = (targetName?: string) => {
    if (!currentTrip) return '';
    const link = buildShareLink();
    const greeting = targetName ? `Hi ${targetName}! ` : 'Hi Family & Friends! ';
    return `${greeting}Join our "${currentTrip.tripName}" trip to ${currentTrip.destination} on Locate U.\n• Room Code: *${currentTrip.roomCode}*\n• Members (${currentTrip.members.length}): ${currentTrip.members.join(', ')}\n• Open Direct Room Link: ${link}`;
  };

  const handleCopyInvite = async () => {
    if (!currentTrip) return;
    const msg = buildInviteMessage();
    if (await copyText(msg)) {
      setCopied(true);
      toast('Invite link & Room Code copied!', { tone: 'success' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = (phone?: string, memberName?: string) => {
    if (!currentTrip) return;
    const msg = buildInviteMessage(memberName);
    const cleanDigits = (phone || '').replace(/\D/g, '');
    const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: profName,
      email: profEmail,
      homeCity: profCity,
      foodPreference: profFood,
      travelStyle: profStyle,
    });
    setSavedBanner(true);
    toast('Profile preferences saved!', { tone: 'success' });
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const memberDetailsList =
    currentTrip?.memberDetails && currentTrip.memberDetails.length === currentTrip.members.length
      ? currentTrip.memberDetails
      : (currentTrip?.members || []).map((m, idx) => ({
          name: m,
          relation: idx === 0 ? 'Organizer' : 'Family / Friend',
          phone: '',
          email: '',
        }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      <Glass className="p-5 sm:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" /> Group Trip &amp; Family Travel Wallet
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Travel Wallet &amp; Group Planner
            </h1>
            <p className="mt-1 text-sm text-muted sm:text-base">
              Add family members or friends, share live WhatsApp room invites, split bills automatically, and track group expenses.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl bg-black/[0.04] p-3 text-xs dark:bg-white/[0.06]">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-500/40"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-brand-600 text-white font-bold grid place-items-center">
                {(profile.name || 'T').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-bold">{profile.name}</div>
              <div className="text-muted text-[11px]">{profile.homeCity}</div>
            </div>
          </div>
        </div>
      </Glass>

      <div className="flex justify-center">
        <Segmented
          label="Planner tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'group', label: 'Group Travel Room', icon: <Users className="h-4 w-4" /> },
            { value: 'wallet', label: 'Travel Wallet & Split', icon: <Wallet className="h-4 w-4" /> },
            { value: 'profile', label: 'Account Profile', icon: <UserCheck className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === 'group' && (
        <div className="space-y-6">
          {currentTrip ? (
            <Card
              title={currentTrip.tripName}
              subtitle={`Destination: ${currentTrip.destination} · Created: ${currentTrip.createdAt}`}
              icon={<Users className="h-5 w-5" />}
              action={
                <button
                  type="button"
                  onClick={leaveTrip}
                  className="rounded-xl bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-500/20 dark:text-red-400"
                >
                  Exit Trip
                </button>
              }
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-brand-600/10 p-4 border border-brand-500/25">
                <div>
                  <div className="text-[11px] font-bold text-muted uppercase">Group Room Code</div>
                  <div className="text-2xl font-black font-mono text-brand-600 dark:text-brand-300 tracking-wider">
                    {currentTrip.roomCode}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    Share on WhatsApp so family &amp; friends can join with 1 click
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleWhatsAppShare()}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-600 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Share Room on WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-brand-600 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied Link!' : 'Copy Invite Link'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-2">
                  Quick-Add Family Members (1 Tap):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_FAMILY_ROLES.map((r) => (
                    <button
                      key={r.name}
                      type="button"
                      onClick={() => handleQuickAddRole(r.name, r.relation)}
                      className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-600 hover:bg-brand-600 hover:text-white transition dark:text-brand-300"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleAddMember}
                className="mt-4 rounded-3xl border border-black/10 bg-black/[0.02] p-4 space-y-3 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <UserPlus className="h-4 w-4 text-brand-600" />
                  <span>Add Family Member or Friend to Group</span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-12">
                  <input
                    type="text"
                    placeholder="Member Name * (e.g. Ramanand, Father, Mother, Priya)..."
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    className="sm:col-span-4 h-10 rounded-2xl border border-black/10 bg-white px-3 text-xs font-semibold focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-slate-900"
                    required
                  />
                  <select
                    value={memberRelation}
                    onChange={(e) => setMemberRelation(e.target.value)}
                    className="sm:col-span-3 h-10 rounded-2xl border border-black/10 bg-white px-2.5 text-xs font-semibold focus:outline-none dark:border-white/10 dark:bg-slate-900"
                  >
                    <option value="Family">👨‍👩‍👧‍👦 Family Member</option>
                    <option value="Father">👨 Father</option>
                    <option value="Mother">👩 Mother</option>
                    <option value="Brother">👦 Brother</option>
                    <option value="Sister">👧 Sister</option>
                    <option value="Friend">🤝 Friend</option>
                    <option value="Colleague">💼 Colleague</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="WhatsApp / Phone (optional)"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    className="sm:col-span-3 h-10 rounded-2xl border border-black/10 bg-white px-3 text-xs font-mono focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 h-10 flex items-center justify-center gap-1 rounded-2xl bg-brand-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-brand-700 active:scale-95 transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Member</span>
                  </button>
                </div>
              </form>

              <div className="mt-5 space-y-2.5">
                <div className="text-xs font-bold uppercase text-muted">
                  Group Members ({currentTrip.members.length}) · Split ₹{perPersonCost}/person:
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {memberDetailsList.map((m, idx) => (
                    <div
                      key={`${m.name}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                          {m.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate">{m.name}</span>
                            <Badge tone="brand">{m.relation || 'Member'}</Badge>
                          </div>
                          {m.phone ? (
                            <div className="text-[11px] font-mono text-muted flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-emerald-500" /> {m.phone}
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted mt-0.5">
                              Share: ₹{perPersonCost}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(m.phone, m.name)}
                          className="rounded-xl bg-emerald-600/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition dark:text-emerald-300"
                        >
                          WhatsApp
                        </button>
                        {currentTrip.members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              removeTripMember(m.name);
                              toast(`Removed ${m.name} from group`);
                            }}
                            className="rounded-xl p-1.5 text-muted hover:bg-red-500/10 hover:text-red-600"
                            title={`Remove ${m.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-2.5 pt-4 border-t hairline">
                <div className="text-xs font-bold uppercase text-muted">Shared Notes &amp; To-Dos:</div>
                <ul className="space-y-1.5 text-xs">
                  {currentTrip.notes.map((n, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-xl bg-black/[0.02] px-3 py-2 dark:bg-white/[0.03]"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-brand-600">✓</span>
                        <span>{n}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTripNote(i)}
                        className="text-muted hover:text-red-600"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleAddNote} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add shared reminder (e.g. Book Tirumala darshanam tickets, carry Aadhar)..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="flex-1 h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                  <button
                    type="submit"
                    className="px-4 h-10 rounded-2xl bg-brand-600 text-xs font-bold text-white hover:bg-brand-700"
                  >
                    Add Note
                  </button>
                </form>
              </div>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <Card
                title="Create a New Family / Group Room"
                subtitle="Start a room, add family members, and share via WhatsApp."
                icon={<Users className="h-5 w-5" />}
              >
                <form onSubmit={handleCreateTrip} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted block mb-1">Trip Name</label>
                    <input
                      type="text"
                      value={tripName}
                      onChange={(e) => setTripName(e.target.value)}
                      placeholder="e.g. Tirupati Darshanam / Araku Family Tour"
                      className="w-full h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block mb-1">Destination</label>
                    <input
                      type="text"
                      value={tripDest}
                      onChange={(e) => setTripDest(e.target.value)}
                      placeholder="e.g. Tirupati, Kakinada, Araku"
                      className="w-full h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-brand-600 py-3 text-xs font-bold text-white hover:bg-brand-700 transition"
                  >
                    <Users className="h-4 w-4" /> Create Group Trip Room
                  </button>
                </form>
              </Card>

              <Card
                title="Join an Existing Group Room"
                subtitle="Have a TRIP-XXXXX room code from a family member? Enter it here."
                icon={<LogIn className="h-5 w-5" />}
              >
                <form onSubmit={handleJoinExistingRoom} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted block mb-1">Group Room Code *</label>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. TRIP-JB7TA"
                      className="w-full h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 font-mono text-xs uppercase focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted block mb-1">Trip Title (optional)</label>
                    <input
                      type="text"
                      value={joinTripNameInput}
                      onChange={(e) => setJoinTripNameInput(e.target.value)}
                      placeholder="e.g. Family Pilgrimage"
                      className="w-full h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    <LogIn className="h-4 w-4" /> Join Group Room
                  </button>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}

      {tab === 'wallet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <span className="text-xs font-bold text-muted uppercase">Total Trip Spend</span>
              <div className="text-2xl font-black mt-1 text-brand-600 dark:text-brand-300">₹{totalSpend}</div>
              <span className="text-[11px] text-muted">{expenses.length} expenses logged</span>
            </div>
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <span className="text-xs font-bold text-muted uppercase">Split Per Member</span>
              <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">₹{perPersonCost}</div>
              <span className="text-[11px] text-muted">Divided among {memberCount} member(s)</span>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04] flex flex-col justify-between">
              <span className="text-xs font-bold text-muted uppercase">Trip Budget Tracker</span>
              <div className="mt-2 h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full"
                  style={{ width: `${Math.min(100, (totalSpend / 8000) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] text-muted mt-2">Budget Target: ₹8,000</span>
            </div>
          </div>

          <Card
            title="Add Trip Expense"
            subtitle="Record spending and select which group member paid."
            icon={<Plus className="h-5 w-5" />}
          >
            <form onSubmit={handleAddExpense} className="grid sm:grid-cols-5 gap-2.5">
              <input
                type="text"
                placeholder="Item (e.g. Subbayya Meals, Auto)..."
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                className="sm:col-span-2 h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                required
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                required
              />
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as any)}
                className="h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-slate-900"
              >
                <option value="Food">🍛 Food</option>
                <option value="Transport">🚖 Transport</option>
                <option value="Stay">🏨 Stay</option>
                <option value="Shopping">🛍️ Shopping</option>
                <option value="Sightseeing">🎟️ Sightseeing</option>
                <option value="Misc">⚙️ Misc</option>
              </select>
              <select
                value={expPayer}
                onChange={(e) => setExpPayer(e.target.value)}
                className="h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-slate-900"
              >
                {activeMembers.map((m) => (
                  <option key={m} value={m}>
                    Paid by: {m}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="sm:col-span-5 flex items-center justify-center gap-1.5 rounded-2xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition"
              >
                <Plus className="h-4 w-4" /> Add Expense
              </button>
            </form>
          </Card>

          <Card
            title="Logged Expenses"
            subtitle="Saved in your browser storage permanently."
            icon={<Wallet className="h-5 w-5" />}
            action={
              expenses.length > 0 && (
                <button onClick={clearExpenses} className="text-xs text-red-600 hover:underline">
                  Clear All
                </button>
              )
            }
          >
            {expenses.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No expenses logged yet.</p>
            ) : (
              <div className="divide-y hairline">
                {expenses.map((e) => (
                  <div key={e.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">{e.title}</div>
                      <div className="text-[11px] text-muted flex gap-2">
                        <span>{e.category}</span>
                        <span>•</span>
                        <span>Paid by: {e.paidBy}</span>
                        <span>•</span>
                        <span>{e.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-brand-600 dark:text-brand-300">₹{e.amount}</span>
                      <button
                        onClick={() => removeExpense(e.id)}
                        className="text-muted hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'profile' && (
        <Card
          title="Personalize Your Account"
          subtitle="Preferences are permanently saved on your device."
          icon={<UserCheck className="h-5 w-5" />}
        >
          {savedBanner && (
            <div className="mb-4 rounded-2xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Profile updated &amp; permanently saved!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted block mb-1">Full Name</label>
                <input
                  type="text"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted block mb-1">Email Address</label>
                <input
                  type="email"
                  value={profEmail}
                  onChange={(e) => setProfEmail(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted block mb-1">Home Town / City</label>
                <input
                  type="text"
                  value={profCity}
                  onChange={(e) => setProfCity(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted block mb-1">Food Preference</label>
                <select
                  value={profFood}
                  onChange={(e) => setProfFood(e.target.value as any)}
                  className="w-full h-10 rounded-2xl border border-black/10 bg-black/[0.02] px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-slate-900"
                >
                  <option value="Non-Veg">🍗 Non-Vegetarian</option>
                  <option value="Vegetarian">🥗 Pure Vegetarian</option>
                  <option value="Vegan">🌱 Vegan</option>
                  <option value="Jain">🌾 Jain</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 w-full rounded-2xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition"
            >
              <Save className="h-4 w-4" /> Save Profile Preferences
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
