export const SIGNAL_TTL_MS = 60 * 60 * 1000;
export const MAX_CANDIDATES = 100;
export const RANKING_VERSION = "github-metadata-v1";

export type RepositoryEvidence = {
  repositoryId: string;
  owner: string;
  fullName: string;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssuesAndPullRequests: number;
  pushedAt: number | null;
  archived: boolean;
  isFork: boolean;
  license: string | null;
  observedAt: number;
  evidenceUrl: string;
};

const clamp = (n: number, max: number) =>
  Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;

/** Metadata-based discovery preference, not an objective quality assessment. */
export function calculateRepositoryRank(
  evidence: RepositoryEvidence,
  calculatedAt: number,
  interests: readonly string[] = [],
) {
  if (!Number.isFinite(calculatedAt)) throw new Error("Invalid calculation time");
  const age = evidence.pushedAt === null || !Number.isFinite(evidence.pushedAt)
    || evidence.pushedAt > calculatedAt
    ? null : (calculatedAt - evidence.pushedAt) / 86_400_000;
  const recentActivity = age === null ? 0 : 40 * Math.max(0, 1 - age / 180);
  const adoption = 10 * clamp(Math.log10(1 + clamp(evidence.stars, 1_000_000)), 6) / 6
    + 5 * clamp(Math.log10(1 + clamp(evidence.forks, 100_000)), 5) / 5;
  const wanted = new Set(interests.slice(0, 30).map((value) => value.trim().toLowerCase()));
  const matches = [...new Set([evidence.language, ...evidence.topics.slice(0, 20)]
    .filter((value): value is string => value !== null)
    .map((value) => value.toLowerCase()))].filter((value) => wanted.has(value));
  const relevance = Math.min(30, matches.length * 10);
  const license = evidence.license && evidence.license !== "NOASSERTION" ? 5 : 0;
  const penalty = (evidence.archived ? 40 : 0) + (evidence.isFork ? 5 : 0);
  const score = Math.round(clamp(recentActivity + adoption + relevance + license - penalty, 100) * 100) / 100;
  return {
    score,
    calculatedAt,
    version: RANKING_VERSION,
    explanations: [
      age === null ? "No usable push timestamp; no freshness points."
        : `Last push ${Math.floor(age)} days ago: ${recentActivity.toFixed(1)} freshness points; a push does not establish maintenance quality.`,
      `${evidence.stars} stars and ${evidence.forks} forks: ${adoption.toFixed(1)} adoption points (capped at 15; not quality).`,
      matches.length ? `Interest matches: ${matches.join(", ")} (+${relevance}).` : "No matching topic or language interests.",
      `Declared SPDX license: ${evidence.license ?? "unknown"} (+${license}); not a licensing assessment.`,
      `${evidence.archived ? "Archived (-40). " : ""}${evidence.isFork ? "Fork (-5). " : ""}Open issues/PRs: ${evidence.openIssuesAndPullRequests}; not scored as responsiveness.`,
      "Release momentum, responsiveness, documentation depth and contributor diversity are not measured by this metadata snapshot.",
    ],
  };
}

/** Bounded candidate window; permanent dismissals are resolved by the caller. */
export function rankRepositories(
  candidates: readonly RepositoryEvidence[],
  options: { calculatedAt: number; interests?: readonly string[]; dismissed?: ReadonlySet<string>; limit?: number },
) {
  const limit = Math.floor(clamp(options.limit ?? 20, 30));
  const ranked = candidates.slice(0, MAX_CANDIDATES)
    .filter((row) => !options.dismissed?.has(row.repositoryId)
      && Number.isFinite(row.observedAt) && row.observedAt <= options.calculatedAt
      && row.observedAt > options.calculatedAt - SIGNAL_TTL_MS)
    .map((evidence) => ({ evidence, ...calculateRepositoryRank(evidence, options.calculatedAt, options.interests) }))
    .sort((a, b) => b.score - a.score || a.evidence.repositoryId.localeCompare(b.evidence.repositoryId));
  const owners = new Map<string, number>();
  const languages = new Map<string, number>();
  const seen = new Set<string>();
  const result: typeof ranked = [];
  for (const row of ranked) {
    if (result.length >= limit) break;
    const owner = row.evidence.owner.toLowerCase();
    const language = row.evidence.language?.toLowerCase() ?? "unknown";
    if (seen.has(row.evidence.repositoryId) || (owners.get(owner) ?? 0) >= 2
      || (languages.get(language) ?? 0) >= Math.max(2, Math.ceil(limit / 2))) continue;
    seen.add(row.evidence.repositoryId);
    owners.set(owner, (owners.get(owner) ?? 0) + 1);
    languages.set(language, (languages.get(language) ?? 0) + 1);
    result.push({ ...row, explanations: [...row.explanations,
      "Selection caps each owner at two repositories and each language at half the requested results (minimum two); results may be underfilled."] });
  }
  return result;
}
