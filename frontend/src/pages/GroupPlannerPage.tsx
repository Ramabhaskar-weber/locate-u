import { useState } from 'react';
import {
  Users,
  Wallet,
  Plus,
  Trash2,
  Copy,
  Check,
  UserCheck,
  Sparkles,
  Save
} from 'lucide-react';
import { Card, Glass, Segmented } from '@/components/ui';
import { useProfile, type WalletExpense } from '@/stores/profile';

type Tab = 'wallet' | 'group' | 'profile';

export default function GroupPlannerPage() {
  const {
    profile,
    updateProfile,
    expenses,
    addExpense,
    removeExpense,
    clearExpenses,
    currentTrip,
    createGroupTrip,
    addTripMember,
    addTripNote,
    leaveTrip
  } = useProfile();

  const [tab, setTab] = useState<Tab>('wallet');
  const [copied, setCopied] = useState(false);

  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<WalletExpense['category']>('Food');
  const [expPayer, setExpPayer] = useState('Self');

  const [tripName, setTripName] = useState('Coastal Andhra Explorer');
  const [tripDest, setTripDest] = useState('Kakinada & Konaseema');
  const [memberInput, setMemberInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const [profName, setProfName] = useState(profile.name);
  const [profEmail, setProfEmail] = useState(profile.email);
  const [profCity, setProfCity] = useState(profile.homeCity);
  const [profFood, setProfFood] = useState(profile.foodPreference);
  const [profStyle, setProfStyle] = useState(profile.travelStyle);
  const [savedBanner, setSavedBanner] = useState(false);

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberCount = currentTrip ? Math.max(1, currentTrip.members.length) : 1;
  const perPersonCost = Math.round(totalSpend / memberCount);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || !expAmount) return;
    addExpense({
      title: expTitle,
      amount: parseFloat(expAmount),
      category: expCategory,
      paidBy: expPayer,
    });
    setExpTitle('');
    setExpAmount('');
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    createGroupTrip(tripName, tripDest, ['Self', 'Friend 1']);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberInput.trim()) return;
    addTripMember(memberInput.trim());
    setMemberInput('');
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    addTripNote(noteInput.trim());
    setNoteInput('');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(
      `Join my group trip on Locate U! Trip Code: ${code}\nLink: https://locate-u.onrender.com/planner`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    setTimeout(() => setSavedBanner(false), 2500);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Glass className="p-6 sm:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" /> Group Trip & Personal Wallet
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Travel Wallet & Group Planner
            </h1>
            <p className="mt-1 text-sm text-muted sm:text-base">
              Track travel expenses, split bills with friends, manage group trips and personalize your account.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-black/[0.04] p-3 text-xs dark:bg-white/[0.06]">
            <div className="h-8 w-8 rounded-full bg-brand-600 text-white font-bold grid place-items-center">
              {profile.name.charAt(0).toUpperCase()}
            </div>
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
            { value: 'wallet', label: 'Travel Wallet & Split', icon: <Wallet className="h-4 w-4" /> },
            { value: 'group', label: 'Group Travel Room', icon: <Users className="h-4 w-4" /> },
            { value: 'profile', label: 'Account Profile', icon: <UserCheck className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === 'wallet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <span className="text-xs font-bold text-muted uppercase">Total Trip Spend</span>
              <div className="text-2xl font-black mt-1 text-brand-600 dark:text-brand-300">₹{totalSpend}</div>
              <span className="text-[11px] text-muted">{expenses.length} expenses logged</span>
            </div>
            <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <span className="text-xs font-bold text-muted uppercase">Split Per Person</span>
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

          <Card title="Add Trip Expense" subtitle="Quickly record spending on food, rides, stays and shopping." icon={<Plus className="h-5 w-5" />}>
            <form onSubmit={handleAddExpense} className="grid sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                placeholder="Item (e.g. Subbayya Meals, Auto to Uppada)..."
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                className="sm:col-span-2 rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                required
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                required
              />
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as any)}
                className="rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="Food">🍛 Food</option>
                <option value="Transport">🚖 Transport</option>
                <option value="Stay">🏨 Stay</option>
                <option value="Shopping">🛍️ Shopping</option>
                <option value="Sightseeing">🎟️ Sightseeing</option>
                <option value="Misc">⚙️ Misc</option>
              </select>
              <button
                type="submit"
                className="sm:col-span-4 flex items-center justify-center gap-1.5 rounded-2xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition"
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
                <button
                  onClick={clearExpenses}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear All
                </button>
              )
            }
          >
            {expenses.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No expenses logged yet. Add your first trip cost above!</p>
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

      {tab === 'group' && (
        <div className="space-y-6">
          {currentTrip ? (
            <Card
              title={currentTrip.tripName}
              subtitle={`Destination: ${currentTrip.destination} · Created: ${currentTrip.createdAt}`}
              icon={<Users className="h-5 w-5" />}
              action={
                <button
                  onClick={leaveTrip}
                  className="text-xs text-red-600 hover:underline"
                >
                  Exit Trip
                </button>
              }
            >
              <div className="flex items-center justify-between rounded-2xl bg-brand-600/10 p-4 border border-brand-500/20">
                <div>
                  <div className="text-[11px] font-bold text-muted uppercase">Group Room Code</div>
                  <div className="text-xl font-black font-mono text-brand-600 dark:text-brand-300">{currentTrip.roomCode}</div>
                </div>
                <button
                  onClick={() => handleCopyCode(currentTrip.roomCode)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-xs font-bold text-white hover:bg-brand-700 transition"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied Link!' : 'Invite via WhatsApp'}</span>
                </button>
              </div>

              <div className="mt-5 space-y-2">
                <div className="text-xs font-bold uppercase text-muted">Group Members ({currentTrip.members.length}):</div>
                <div className="flex flex-wrap gap-2">
                  {currentTrip.members.map((m, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {m}
                    </span>
                  ))}
                </div>

                <form onSubmit={handleAddMember} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add friend's name (e.g. Ramesh, Priya)..."
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    className="flex-1 rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                  <button type="submit" className="px-4 py-2 rounded-2xl bg-brand-600 text-xs font-bold text-white hover:bg-brand-700">
                    Add
                  </button>
                </form>
              </div>

              <div className="mt-6 space-y-2 pt-4 border-t hairline">
                <div className="text-xs font-bold uppercase text-muted">Shared Notes & To-Dos:</div>
                <ul className="space-y-1.5 text-xs text-muted">
                  {currentTrip.notes.map((n, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-brand-600">✓</span> {n}
                    </li>
                  ))}
                </ul>

                <form onSubmit={handleAddNote} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add shared reminder (e.g. Book Coringa boat safari)..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="flex-1 rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                  <button type="submit" className="px-4 py-2 rounded-2xl bg-black/5 text-xs font-semibold hover:bg-black/10 dark:bg-white/10">
                    Add Note
                  </button>
                </form>
              </div>
            </Card>
          ) : (
            <Card title="Start or Join a Group Trip" subtitle="Travel together with synchronized itineraries and split bills." icon={<Users className="h-5 w-5" />}>
              <form onSubmit={handleCreateTrip} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-muted block mb-1">Trip Name</label>
                  <input
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="e.g. Godavari Weekend Tour"
                    className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted block mb-1">Destination</label>
                  <input
                    type="text"
                    value={tripDest}
                    onChange={(e) => setTripDest(e.target.value)}
                    placeholder="e.g. Kakinada & Uppada"
                    className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
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
          )}
        </div>
      )}

      {tab === 'profile' && (
        <Card title="Personalize Your Account" subtitle="Preferences are permanently saved on your device and restored across all refreshes." icon={<UserCheck className="h-5 w-5" />}>
          {savedBanner && (
            <div className="mb-4 rounded-2xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Profile updated & permanently saved to your device!</span>
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
                  className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted block mb-1">Email Address</label>
                <input
                  type="email"
                  value={profEmail}
                  onChange={(e) => setProfEmail(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
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
                  placeholder="e.g. Mandapeta, Kakinada, Rajahmundry"
                  className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted block mb-1">Food Preference</label>
                <select
                  value={profFood}
                  onChange={(e) => setProfFood(e.target.value as any)}
                  className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <option value="Non-Veg">🍗 Non-Vegetarian (Seafood, Biryani, Meat)</option>
                  <option value="Vegetarian">🥗 Pure Vegetarian (Andhra Bhojanam, South Indian)</option>
                  <option value="Vegan">🌱 Vegan</option>
                  <option value="Jain">🌾 Jain</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted block mb-1">Travel Style</label>
              <select
                value={profStyle}
                onChange={(e) => setProfStyle(e.target.value as any)}
                className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-3 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="Family Explorer">👨‍👩‍👧 Family Explorer (Temples, scenic beaches, safe resorts)</option>
                <option value="Budget Backpacker">🎒 Budget Backpacker (Hostels, bus transit, budget thalis)</option>
                <option value="Heritage & Culture">🛕 Heritage & Culture (Ancient ruins, historical temples)</option>
                <option value="Nature & Relaxation">🌿 Nature & Relaxation (Mangroves, waterfalls, hills)</option>
              </select>
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
