import { useState } from 'react';
import {
  Compass,
  PhoneCall,
  Utensils,
  Hotel,
  Bot,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Search,
  Droplet,
  Fuel
} from 'lucide-react';
import { Card, Glass, Segmented } from '@/components/ui';
import {
  ATTRACTIONS,
  FOOD_SPOTS,
  STAYS,
  EMERGENCY_CONTACTS
} from '@/lib/travelEngine';

type HubTab = 'attractions' | 'food' | 'stays' | 'ai' | 'sos' | 'utilities';

export default function ExploreHubPage() {
  const [tab, setTab] = useState<HubTab>('attractions');
  const [search, setSearch] = useState('');
  const [aiDays, setAiDays] = useState<'1' | '3' | 'weekend'>('3');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Namaste! I am your Locate U AI Travel Assistant. Ask me about must-see tourist spots, famous local foods, best seasons to visit, or festival timings anywhere in India!' }
  ]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    const userMsg = { sender: 'user' as const, text: q };
    
    let reply = `Here are some recommendations for "${q}":\n\n1. Must-visit: Explore nearby heritage and scenic coastal viewpoints.\n2. Food tip: Try the local traditional thali or authentic sweets.\n3. Best timing: Mornings (8 AM - 11 AM) and evenings (4:30 PM - 7 PM) avoid peak heat.\n4. Transport: You can use our Transport Hub to book a 1-click ride directly there!`;
    if (q.toLowerCase().includes('kakinada')) {
      reply = `In Kakinada, do not miss:\n• Coringa Mangrove Sanctuary & boat safari\n• Uppada Beach & handloom silk weaving\n• Subbayya Gari authentic Andhra Bhojanam\n• Famous hot Gottam Kaja from Kotaiah sweet shop!`;
    } else if (q.toLowerCase().includes('food') || q.toLowerCase().includes('eat')) {
      reply = `Top food recommendations in this region:\n• Authentic Andhra Meals with fresh podi & ghee\n• Putharekulu and Gottam Kaja sweets\n• Rayalaseema Ragi Mudda or Chepala Pulusu (Fish curry) near the coast.`;
    }

    setChatMessages((prev) => [...prev, userMsg, { sender: 'ai', text: reply }]);
    setChatInput('');
  };

  const filteredAttractions = ATTRACTIONS.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.district.toLowerCase().includes(search.toLowerCase()) || a.state.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFood = FOOD_SPOTS.filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.city.toLowerCase().includes(search.toLowerCase()) || f.specialty.toLowerCase().includes(search.toLowerCase())
  );
  const filteredStays = STAYS.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Glass className="p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
          <Sparkles className="h-3.5 w-3.5" /> All-in-One Travel Super-App
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Travel & Tourist Guide
        </h1>
        <p className="mt-1 text-sm text-muted sm:text-base">
          Discover iconic tourist attractions, local food, verified stays, AI trip itineraries, and 1-tap emergency helplines.
        </p>
      </Glass>

      <div className="flex justify-center overflow-x-auto pb-2">
        <Segmented
          label="Explore tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'attractions', label: 'Attractions', icon: <Compass className="h-4 w-4" /> },
            { value: 'food', label: 'Food & Dining', icon: <Utensils className="h-4 w-4" /> },
            { value: 'stays', label: 'Stays & Hotels', icon: <Hotel className="h-4 w-4" /> },
            { value: 'ai', label: 'AI Trip Planner', icon: <Bot className="h-4 w-4" /> },
            { value: 'sos', label: 'Emergency SOS', icon: <ShieldAlert className="h-4 w-4" /> },
            { value: 'utilities', label: 'Public Utilities', icon: <Droplet className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === 'attractions' && (
        <Card title="Famous Attractions & Heritage Spots" subtitle="Curated destinations across Andhra Pradesh and India." icon={<Compass className="h-5 w-5" />}>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by monument, beach, or district (e.g. Kakinada, Hampi, Hyderabad)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-black/[0.02] py-2.5 px-4 text-sm focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredAttractions.map((a) => (
              <div key={a.id} className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">{a.category} · {a.district}</span>
                      <h3 className="text-base font-bold">{a.name}</h3>
                    </div>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium dark:bg-white/10">{a.bestTime}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted leading-relaxed">{a.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t hairline flex items-center justify-between text-xs font-medium">
                  <span className="text-emerald-600 dark:text-emerald-400">✨ {a.famousFor}</span>
                  <a href={`/map?q=${encodeURIComponent(a.name)}`} className="text-brand-600 hover:underline dark:text-brand-300">View on Map →</a>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'food' && (
        <Card title="Food Discovery System" subtitle="Famous regional dining, Andhra messes, iconic sweets & cafes." icon={<Utensils className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFood.map((f) => (
              <div key={f.id} className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-300">{f.type}</span>
                    <span className="text-xs font-bold text-muted">{f.priceRange}</span>
                  </div>
                  <h3 className="mt-2 font-bold text-base">{f.name}</h3>
                  <p className="text-xs text-muted font-medium">{f.city}</p>
                  <p className="mt-2 text-xs text-muted">{f.specialty}</p>
                </div>
                <a href={`/transport?destName=${encodeURIComponent(f.name + ' ' + f.city)}`} className="mt-4 flex h-8 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700">
                  <span>Ride here (1-Click)</span> <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'stays' && (
        <Card title="Stay & Accommodation Explorer" subtitle="Verified budget lodges, government beach resorts & homestays." icon={<Hotel className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredStays.map((s) => (
              <div key={s.id} className="flex flex-col justify-between rounded-3xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-brand-600 dark:text-brand-400">{s.type}</span>
                    <span className="font-extrabold text-sm">{s.pricePerNight}</span>
                  </div>
                  <h3 className="mt-1 font-bold text-base">{s.name}</h3>
                  <p className="text-xs text-muted">{s.location}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.amenities.map((am) => (
                      <span key={am} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-muted dark:bg-white/10">✓ {am}</span>
                    ))}
                  </div>
                </div>
                <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" className="mt-5 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700">
                  <span>Check Availability</span> <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'ai' && (
        <div className="space-y-6">
          <Card title="AI Travel Itinerary Generator" subtitle="Generate personalized schedules based on your travel length." icon={<Bot className="h-5 w-5" />}>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setAiDays('1')} className={`px-4 py-2 rounded-2xl text-xs font-semibold ${aiDays === '1' ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/10'}`}>1-Day Express</button>
              <button onClick={() => setAiDays('3')} className={`px-4 py-2 rounded-2xl text-xs font-semibold ${aiDays === '3' ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/10'}`}>3-Day Deep Dive</button>
              <button onClick={() => setAiDays('weekend')} className={`px-4 py-2 rounded-2xl text-xs font-semibold ${aiDays === 'weekend' ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/10'}`}>Weekend Getaway</button>
            </div>
            
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04] space-y-3">
              <h4 className="font-bold text-sm text-brand-600 dark:text-brand-400">✨ Generated Itinerary ({aiDays === '1' ? '1 Day' : aiDays === '3' ? '3 Days' : 'Weekend'}):</h4>
              <ul className="space-y-2 text-xs text-muted">
                <li>• <strong>Morning (8:30 AM):</strong> Breakfast at traditional tiffin stall, followed by Coringa Mangrove Sanctuary boat safari.</li>
                <li>• <strong>Afternoon (1:00 PM):</strong> Authentic banana leaf Andhra bhojanam at Subbayya Gari Hotel.</li>
                <li>• <strong>Evening (4:30 PM):</strong> Coastal breeze and sunset walk at Uppada Beach with a visit to traditional silk weavers.</li>
                <li>• <strong>Night (8:00 PM):</strong> Hot Gottam Kaja sweets from Kotaiah shop and night stroll.</li>
              </ul>
            </div>
          </Card>

          <Card title="AI Travel Assistant (Live Chat)" subtitle="Ask any question about travel routes, culture, food or timings." icon={<Sparkles className="h-5 w-5" />}>
            <div className="max-h-64 overflow-y-auto space-y-3 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04]">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${m.sender === 'user' ? 'bg-brand-600 text-white' : 'bg-black/5 dark:bg-white/10 whitespace-pre-wrap'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Ask e.g. 'What is famous in Kakinada?' or 'Best beaches in Andhra Pradesh?'..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 rounded-2xl border border-black/10 bg-black/[0.02] py-2 px-4 text-xs focus:outline-none dark:border-white/10 dark:bg-white/[0.04]"
              />
              <button type="submit" className="rounded-2xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700">Send</button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'sos' && (
        <Card title="Emergency SOS & Tourist Safety Bar" subtitle="One-tap direct calling for all official emergency services across India." icon={<ShieldAlert className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EMERGENCY_CONTACTS.map((em) => (
              <div key={em.number} className="flex flex-col justify-between rounded-3xl border border-red-500/20 bg-red-500/[0.03] p-5 dark:border-red-400/20 dark:bg-red-500/[0.06]">
                <div>
                  <span className="text-2xl font-black text-red-600 dark:text-red-400">{em.number}</span>
                  <h4 className="mt-1 font-bold text-sm">{em.label}</h4>
                  <p className="mt-1 text-xs text-muted">{em.desc}</p>
                </div>
                <a href={`tel:${em.number}`} className="mt-4 flex h-9 items-center justify-center gap-2 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700">
                  <PhoneCall className="h-3.5 w-3.5" /> Call {em.number} Now
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'utilities' && (
        <Card title="Public Utility Finder" subtitle="Quick directions to essential public amenities near you." icon={<Droplet className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-3">
            <a href="/map?q=public+toilets" className="flex items-center gap-3 p-4 rounded-2xl border border-black/10 bg-black/[0.02] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600"><Droplet className="h-5 w-5" /></div>
              <div>
                <h4 className="text-sm font-bold">Public Restrooms</h4>
                <p className="text-xs text-muted">Clean Swachh Bharat Toilets</p>
              </div>
            </a>
            <a href="/map?q=fuel+station" className="flex items-center gap-3 p-4 rounded-2xl border border-black/10 bg-black/[0.02] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><Fuel className="h-5 w-5" /></div>
              <div>
                <h4 className="text-sm font-bold">Petrol & EV Chargers</h4>
                <p className="text-xs text-muted">Fuel stations & EV charging</p>
              </div>
            </a>
            <a href="/map?q=hospital" className="flex items-center gap-3 p-4 rounded-2xl border border-black/10 bg-black/[0.02] hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.04]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-600"><ShieldAlert className="h-5 w-5" /></div>
              <div>
                <h4 className="text-sm font-bold">24/7 Hospitals</h4>
                <p className="text-xs text-muted">Emergency trauma centers</p>
              </div>
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}
