import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { SavedLocation } from '@/lib/db';
import { useSaved } from '@/stores/saved';
import { toast } from '@/stores/toast';
import { Button, cn, Input, Modal } from '../ui';

const COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#0ea5e9', '#64748b'];

export const saveSchema = z.object({
  name: z.string().trim().min(1, 'Give this place a name').max(200, 'Keep the name under 200 characters'),
  collection: z.string().trim().max(80, 'Too long').optional().or(z.literal('')),
  tags: z.string().max(400).optional(),
  note: z.string().max(2000, 'Notes are limited to 2000 characters').optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});
export type SaveForm = z.infer<typeof saveSchema>;

export function parseTags(s?: string): string[] {
  return Array.from(new Set((s ?? '').split(',').map((t) => t.trim()).filter(Boolean))).slice(0, 20);
}

interface Initial {
  name: string;
  lat: number;
  lon: number;
  address?: string;
  source: SavedLocation['source'];
  source_ref?: string;
}

export function SaveDialog({ open, onClose, initial, existing }: { open: boolean; onClose: () => void; initial?: Initial; existing?: SavedLocation }) {
  const add = useSaved((s) => s.add);
  const update = useSaved((s) => s.update);
  const collections = useSaved((s) => Array.from(new Set(s.items.map((i) => i.collection).filter(Boolean))) as string[]);
  const { register, handleSubmit, reset, setValue, watch, formState } = useForm<SaveForm>({
    resolver: zodResolver(saveSchema),
    defaultValues: { name: '', collection: '', tags: '', note: '', color: COLORS[0] },
  });
  useEffect(() => {
    if (!open) return;
    reset(
      existing
        ? { name: existing.name, collection: existing.collection ?? '', tags: existing.tags.join(', '), note: existing.note ?? '', color: existing.color ?? COLORS[0] }
        : { name: initial?.name ?? '', collection: '', tags: '', note: '', color: COLORS[0] },
    );
  }, [open, existing, initial, reset]);
  const color = watch('color');

  const onSubmit = handleSubmit(async (v) => {
    const payload = { name: v.name, collection: v.collection || null, tags: parseTags(v.tags), note: v.note || null, color: v.color };
    if (existing) {
      await update(existing.id, payload);
      toast('Saved changes', { tone: 'success' });
    } else if (initial) {
      await add({ ...payload, lat: initial.lat, lon: initial.lon, address: initial.address ?? null, source: initial.source, source_ref: initial.source_ref ?? null });
      toast('Saved to this device', { tone: 'success', description: 'Find it under Saved places — it works offline too.' });
    }
    onClose();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit saved place' : 'Save place'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSubmit} loading={formState.isSubmitting}>{existing ? 'Save changes' : 'Save'}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Name" {...register('name')} error={formState.errors.name?.message} autoComplete="off" />
        <div>
          <Input label="Collection" placeholder="e.g. Goa trip" list="lu-collections" {...register('collection')} error={formState.errors.collection?.message} />
          <datalist id="lu-collections">{collections.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <Input label="Tags" placeholder="beach, sunset, family" hint="Separate with commas" {...register('tags')} />
        <div>
          <label htmlFor="lu-note" className="mb-1.5 block text-[13px] font-medium">Note</label>
          <textarea id="lu-note" rows={3} {...register('note')} className="w-full rounded-2xl border hairline bg-white/80 px-4 py-3 text-[15px] outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:bg-white/[0.06]" />
          {formState.errors.note && <p className="mt-1 text-[13px] text-red-600">{formState.errors.note.message}</p>}
        </div>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Colour</legend>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                onClick={() => setValue('color', c)}
                className={cn('h-8 w-8 rounded-full border-2 transition', color === c ? 'scale-110 border-[rgb(var(--fg))]' : 'border-transparent')}
                style={{ background: c }}
              />
            ))}
          </div>
        </fieldset>
        <p className="text-[12px] text-muted">Saved places stay on this device unless you sign in and turn on sync in Settings.</p>
      </form>
    </Modal>
  );
}
