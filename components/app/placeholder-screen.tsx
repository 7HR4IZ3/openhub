import { CurationShell } from "@/components/curation/curation-shell";
import { CurationEmptyState } from "@/components/curation/curation-states";
import { ReaderIcon } from "@radix-ui/react-icons";

export function PlaceholderScreen({
  eyebrow,
  title,
  body,
  action = "Explore repositories",
  actionHref = "/explore",
}: {
  eyebrow: string;
  title: string;
  body: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <CurationShell active="Home" eyebrow={eyebrow} title={title}>
      <div className="page-section">
        <CurationEmptyState
          icon={ReaderIcon}
          eyebrow={eyebrow}
          title={title}
          body={body}
          action={action}
          actionHref={actionHref}
        />
      </div>
    </CurationShell>
  );
}
