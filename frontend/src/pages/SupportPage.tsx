import { Bug, HelpCircle, LifeBuoy, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui';

const FAQS = [
  {
    q: 'How does Smart Transport Hub book rides on Uber, Ola, and Rapido?',
    a: 'Locate U pre-fills your pickup and drop-off coordinates into Uber, Ola, and Google Maps automatically. For Rapido (which only accepts bookings inside its mobile app without a public web deep-link API), Locate U opens the Rapido app directly and copies your exact destination to your clipboard for 1-tap paste.',
  },
  {
    q: 'Why did my Gmail OTP go to Spam or Promotions?',
    a: 'Check your Spam or Promotions tab in Gmail for an email from Locate U, and mark it as "Not Spam" so future 6-digit OTPs arrive in your Primary inbox.',
  },
  {
    q: 'How do I invite family or friends to a Group Travel Room?',
    a: 'Open Wallet & Trips (/planner), create a trip, add family members using the quick buttons or custom form, and tap "Invite via WhatsApp" to send your Room Code.',
  },
  {
    q: 'How do I install the Locate U Android App (APK)?',
    a: 'Download Locate.U.apk from the homepage badge or GitHub Releases, tap Install, and choose "Install anyway" if Play Protect asks about an unverified publisher.',
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12 w-full overflow-x-hidden">
      <header className="pt-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-400/25 px-3 py-1 text-xs font-semibold text-sky-400 mb-3">
          <LifeBuoy className="h-3.5 w-3.5" />
          Locate U Help &amp; Support
        </div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">How can we help?</h1>
        <p className="mt-1 text-[15px] text-muted">
          Quick answers, ride-booking tips, and direct contact with the Locate U developer.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card icon={<Mail className="h-5 w-5" />} title="Email Support" subtitle="Reply within 24 hours">
          <p className="text-xs text-muted mb-4">Questions about your account, OTP delivery, or feature feedback.</p>
          <a href="mailto:ramachidvilas@gmail.com?subject=Locate%20U%20Support">
            <Button variant="primary" size="sm" className="w-full" icon={<Mail className="h-4 w-4" />}>Email Developer</Button>
          </a>
        </Card>
        <Card icon={<MessageCircle className="h-5 w-5" />} title="WhatsApp Help" subtitle="Quick mobile support">
          <p className="text-xs text-muted mb-4">Need help installing the Android APK or joining a Group Travel Room?</p>
          <a href="https://wa.me/919493652840?text=Hi%20Locate%20U%20Support%2C%20I%20need%20help%20with..." target="_blank" rel="noopener noreferrer">
            <Button variant="glass" size="sm" className="w-full" icon={<MessageCircle className="h-4 w-4" />}>Chat on WhatsApp</Button>
          </a>
        </Card>
        <Card icon={<Bug className="h-5 w-5" />} title="Report a Bug" subtitle="GitHub Issue Tracker">
          <p className="text-xs text-muted mb-4">Found a broken map pin or UI issue? Open an issue on GitHub.</p>
          <a href="https://github.com/Ramabhaskar-weber/locate-u/issues/new" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" className="w-full" icon={<Bug className="h-4 w-4" />}>Open GitHub Issue</Button>
          </a>
        </Card>
      </div>

      <Card icon={<HelpCircle className="h-5 w-5" />} title="Frequently Asked Questions">
        <div className="divide-y hairline">
          {FAQS.map((item) => (
            <div key={item.q} className="py-3.5 first:pt-0 last:pb-0">
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card icon={<ShieldCheck className="h-5 w-5" />} title="Privacy &amp; Legal">
        <p className="text-xs sm:text-sm text-muted">
          Review how Locate U handles GPS coordinates, OTP verification, and local storage on our{' '}
          <Link to="/privacy" className="text-sky-400 underline font-medium">Privacy Policy</Link> page.
        </p>
      </Card>
    </div>
  );
}
