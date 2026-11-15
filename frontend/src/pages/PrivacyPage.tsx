import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 w-full overflow-x-hidden pb-10">
      <header className="pt-2">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-1 text-[15px] text-muted">
          Effective date: November 13, 2026 · Locate U (com.locateu.app)
        </p>
      </header>
      <Card icon={<ShieldCheck className="h-5 w-5" />} title="Information We Collect" subtitle="Only what is needed to power maps, OTP sign-in, and trip planning">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li><strong>Account &amp; Profile Details:</strong> Name, email, phone number, home city, optional photo, and travel preferences.</li>
          <li><strong>OTP Verification:</strong> Email and phone number are used solely to send one-time verification codes.</li>
          <li><strong>Location Data:</strong> GPS coordinates are accessed only when you tap location features and are never sold.</li>
          <li><strong>Saved Places &amp; Group Trips:</strong> Stored locally on your device and synced when signed in.</li>
        </ul>
      </Card>
      <Card title="Third-Party Services &amp; Data Deletion">
        <p className="text-sm leading-relaxed text-muted">
          Map tiles and geocoding rely on OpenStreetMap / Nominatim. Contact{' '}
          <a href="mailto:ramachidvilas@gmail.com" className="text-sky-400 underline">ramachidvilas@gmail.com</a>{' '}
          anytime for data removal.
        </p>
      </Card>
    </div>
  );
}
