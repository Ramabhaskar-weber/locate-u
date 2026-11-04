import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Glass } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg pt-10">
      <Glass>
        <EmptyState
          title="This page wandered off the map"
          description="The link may be broken or the page may have moved."
          icon={<Compass className="h-6 w-6" />}
          action={<Link to="/"><Button variant="primary">Back home</Button></Link>}
        />
      </Glass>
    </div>
  );
}
