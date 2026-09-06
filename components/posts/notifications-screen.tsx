"use client";

import { useConvexAuth, useMutation, usePaginatedQuery } from "convex/react";
import Link from "next/link";
import {
  BellIcon as Bell,
  CheckIcon as Check,
  HeartIcon as Heart,
  ChatBubbleIcon as MessageCircle,
  LoopIcon as Repeat2,
} from "@radix-ui/react-icons";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CurationEmptyState,
  CurationLoading,
} from "@/components/curation/curation-states";
import { CurationShell } from "@/components/curation/curation-shell";
import { Button } from "@/components/ui/button";

export function NotificationsScreen({
  convexConfigured,
}: {
  convexConfigured: boolean;
}) {
  if (!convexConfigured) return <NotificationsSetup />;
  return <ConnectedNotifications />;
}

function ConnectedNotifications() {
  const { isAuthenticated } = useConvexAuth();
  const {
    results: notifications,
    status,
    isLoading,
    loadMore,
  } = usePaginatedQuery(
    api.notifications.listPage,
    {},
    { initialNumItems: 30 },
  );
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const unreadCount = notifications.filter(
    (notification) => notification.readAt === undefined,
  ).length;

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
      <CurationShell
        active="Notifications"
        eyebrow="notifications"
        title="Useful updates"
      >
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-8">
        <p className="text-sm text-muted-foreground">
          {unreadCount
            ? `${unreadCount} unread in this view`
            : "You are all caught up"}
        </p>
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void markAllRead()}
          >
            <Check />
            Mark all read
          </Button>
        ) : null}
      </div>
      <section
        className="divide-y divide-black/[0.08] p-5 dark:divide-white/[0.08] sm:p-7"
        aria-label="Notifications"
      >
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
                if (notification.readAt === undefined)
                  void markRead({ notificationId: notification._id });
              }}
            />
          ))
        )}
        {notifications.length > 0 &&
        (status === "CanLoadMore" || status === "LoadingMore") ? (
          <div className="pt-5 text-center">
            <Button
              type="button"
              variant="ghost"
              className="rounded-md text-xs"
              onClick={() => loadMore(30)}
              disabled={status !== "CanLoadMore"}
            >
              {status === "LoadingMore"
                ? "Loading…"
                : "Load older notifications"}
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
  const icon =
    notification.type === "like"
      ? Heart
      : notification.type === "comment"
        ? MessageCircle
        : Repeat2;
  const Icon = icon;
  const actor = notification.actor?.displayName ?? "Someone";
  const action =
    notification.type === "like"
      ? "liked your post"
      : notification.type === "comment"
        ? "added context to your post"
        : notification.type === "mention"
          ? "mentioned you"
          : notification.type === "quote"
            ? "quoted your post"
            : notification.type === "repost"
              ? "reposted your post"
              : "sent you an update";
  const content = `${actor} ${action}`;

  const contentBlock = (
    <div className="min-w-0 flex-1">
      <p className="text-sm leading-6">
        <span className="font-semibold">{content}</span>
        {notification.readAt === undefined ? (
          <span
            className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-foreground align-middle"
            aria-label="Unread"
          />
        ) : null}
      </p>
      <time
        className="mt-1 block text-xs text-muted-foreground"
        dateTime={new Date(notification.createdAt).toISOString()}
      >
        {formatDate(notification.createdAt)}
      </time>
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-5 first:pt-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary dark:bg-secondary">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      {notification.postId ? (
        <Link
          href={`/posts/${notification.postId}`}
          onClick={onRead}
          className="min-w-0 flex-1 rounded-xl transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
        >
          {contentBlock}
        </Link>
      ) : (
        contentBlock
      )}
      {notification.readAt === undefined ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 rounded-md"
          onClick={onRead}
          aria-label="Mark notification as read"
        >
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
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
