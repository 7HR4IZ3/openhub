"use client";

import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { Bell, Check, Heart, MessageCircle, Repeat2, Sparkles } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CurationEmptyState, CurationLoading } from "@/components/curation/curation-states";
import { CurationShell } from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";

export function NotificationsScreen({ convexConfigured }: { convexConfigured: boolean }) {
  if (!convexConfigured) return <NotificationsSetup />;
  return <ConnectedNotifications />;
}

function ConnectedNotifications() {
  const { isAuthenticated } = useConvexAuth();
  const { results: notifications, status, isLoading, loadMore } = usePaginatedQuery(
    api.notifications.listPage,
    {},
    { initialNumItems: 30 },
  );
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const unreadCount = notifications.filter((notification) => notification.readAt === undefined).length;

  if (!isAuthenticated) {
    return (
      <CurationShell
        active="Notifications"
        eyebrow="notifications"
        title="Useful updates"
        description="Mentions, replies, reactions, and repository activity that help you continue a technical trail."
      >
        <CurationEmptyState
          className="m-5 sm:m-7"
          icon={Bell}
          eyebrow="Sign in to continue"
          title="Your notification trail is private."
          body="Connect GitHub to see replies and reactions addressed to you. OpenHub does not expose private activity in public feeds."
          action="Connect GitHub"
          actionHref="/signin"
          secondaryAction="Browse first"
          secondaryHref="/explore"
        />
      </CurationShell>
    );
  }

  if (isLoading && notifications.length === 0) {
    return (
      <CurationShell active="Notifications" eyebrow="notifications" title="Useful updates">
        <CurationLoading label="Loading your notifications…" />
      </CurationShell>
    );
  }

  return (
    <CurationShell
      active="Notifications"
      eyebrow="notifications"
      title="Useful updates"
      description="Keep the replies, mentions, and repository activity that move your understanding forward."
    >
      <div className="border-b border-black/[0.08] p-5 dark:border-white/[0.08] sm:p-7">
        <div className="flex flex-col gap-4 rounded-2xl bg-[#e9e6dc] p-5 dark:bg-[#20251f] sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#b45e3c] dark:text-[#e99970]" /><p className="text-sm leading-6 text-muted-foreground">Notifications stay focused on context: someone replied to your source, added a useful reaction, or continued a project trail you follow.</p></div>
          {unreadCount > 0 ? <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full bg-transparent" onClick={() => void markAllRead()}><Check className="h-3.5 w-3.5" />Mark all read</Button> : null}
        </div>
      </div>
      <section className="divide-y divide-black/[0.08] p-5 dark:divide-white/[0.08] sm:p-7" aria-label="Notifications">
        {notifications.length === 0 ? (
          <CurationEmptyState
            icon={Bell}
            eyebrow="Nothing new"
            title="Your trail is quiet."
            body="When someone adds useful context to your posts, you will find it here."
            action="Explore repositories"
            actionHref="/explore"
          />
        ) : (
          notifications.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
              onRead={() => {
                if (notification.readAt === undefined) void markRead({ notificationId: notification._id });
              }}
            />
          ))
        )}
        {notifications.length > 0 && (status === "CanLoadMore" || status === "LoadingMore") ? (
          <div className="pt-5 text-center">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-xs"
              onClick={() => loadMore(30)}
              disabled={status !== "CanLoadMore"}
            >
              {status === "LoadingMore" ? "Loading…" : "Load older notifications"}
            </Button>
          </div>
        ) : null}
      </section>
    </CurationShell>
  );
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: {
    _id: Id<"notifications">;
    actor: { displayName: string; handle: string } | null;
    type: "like" | "comment" | "repost" | "quote" | "mention" | "system";
    postId?: Id<"posts">;
    createdAt: number;
    readAt?: number;
  };
  onRead: () => void;
}) {
  const icon = notification.type === "like" ? Heart : notification.type === "comment" ? MessageCircle : Repeat2;
  const Icon = icon;
  const actor = notification.actor?.displayName ?? "Someone";
  const action = notification.type === "like" ? "liked your post" : notification.type === "comment" ? "added context to your post" : notification.type === "mention" ? "mentioned you" : notification.type === "quote" ? "quoted your post" : notification.type === "repost" ? "reposted your post" : "sent you an update";
  const content = `${actor} ${action}`;

  const contentBlock = (
    <div className="min-w-0 flex-1">
      <p className="text-sm leading-6"><span className="font-semibold">{content}</span>{notification.readAt === undefined ? <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#b45e3c] align-middle" aria-label="Unread" /> : null}</p>
      <time className="mt-1 block text-xs text-muted-foreground" dateTime={new Date(notification.createdAt).toISOString()}>{formatDate(notification.createdAt)}</time>
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-5 first:pt-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9e6dc] dark:bg-[#20251f]">
        <Icon className="h-4 w-4 text-[#9b4d31] dark:text-[#e99970]" />
      </div>
      {notification.postId ? (
        <Link href={`/posts/${notification.postId}`} onClick={onRead} className="min-w-0 flex-1 rounded-xl transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
          {contentBlock}
        </Link>
      ) : contentBlock}
      {notification.readAt === undefined ? (
        <Button type="button" variant="ghost" size="sm" className="shrink-0 rounded-full" onClick={onRead} aria-label="Mark notification as read">
          <Check className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Read</span>
        </Button>
      ) : null}
    </div>
  );
}

function NotificationsSetup() {
  return (
    <CurationShell
      active="Notifications"
      eyebrow="notifications"
      title="Useful updates"
      description="A focused place for replies, mentions, and reactions that help you keep learning."
    >
      <CurationEmptyState
        className="m-5 sm:m-7"
        icon={Bell}
        eyebrow="Backend connection needed"
        title="Your notification trail is ready."
        body="Connect the Convex deployment to load realtime updates. No notification data is requested while the backend is unavailable."
        action="Explore repositories"
        actionHref="/explore"
        secondaryAction="Connect GitHub"
        secondaryHref="/signin"
      />
    </CurationShell>
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
