import { PageHeader } from "@/components/layout/PageHeader";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  sprint?: string;
}

export function ModulePlaceholder({
  title,
  description,
  sprint,
}: ModulePlaceholderProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed border-[var(--brand-primary)]/40 bg-orange-50/30 p-8 text-center">
        <p className="text-sm text-[var(--neutral-600)]">
          Module scaffolded — full implementation per spec roadmap
          {sprint ? ` (${sprint})` : ""}.
        </p>
      </div>
    </div>
  );
}
