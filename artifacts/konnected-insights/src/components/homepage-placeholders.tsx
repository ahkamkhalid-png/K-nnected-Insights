import { BookOpen, CalendarDays, GraduationCap, Layers, Mic, Users, UsersRound } from 'lucide-react';

const sections = {
  masterclasses: [GraduationCap, 'Masterclass', 'No masterclasses announced yet.', 'More masterclasses will appear here.'],
  research: [Layers, 'Future of Work', 'No research briefs published yet.', 'New research briefs will appear here.'],
  newsletters: [BookOpen, 'Newsletter', 'No newsletters published yet.', 'New editions will appear here.'],
  team: [Users, 'Core Team', 'No team profiles published yet.', 'New team profiles will appear here.'],
  communities: [UsersRound, 'Community', 'No communities listed yet.', 'New communities will appear here.'],
  events: [CalendarDays, 'Event', 'No upcoming events announced yet.', 'New event dates will appear here.'],
  talks: [Mic, 'Talk', 'No talks published yet.', 'New talks will appear here.'],
} as const;

/** Decorative slots only. Never add placeholder records to a CMS response. */
export function HomepagePlaceholders({ section, count }: { section: keyof typeof sections; count: number }) {
  const [Icon, label, empty, more] = sections[section];
  return <>{Array.from({ length: Math.max(0, 3 - count) }, (_, i) => (
    <div key={i} data-home-placeholder={section} className="relative flex min-h-36 flex-col justify-between gap-5 overflow-hidden rounded-sm border border-border bg-muted/45 p-5 sm:min-h-44 sm:p-7">
      <span aria-hidden="true" className="flex items-center justify-between text-primary"><Icon strokeWidth={1.4} size={23} /><span className="text-[10px] tracking-widest">{String(count + i + 1).padStart(2, '0')}</span></span>
      <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="font-display text-xl leading-tight text-foreground">{!count && i === 0 ? empty : more}</p></div>
    </div>
  ))}</>;
}
