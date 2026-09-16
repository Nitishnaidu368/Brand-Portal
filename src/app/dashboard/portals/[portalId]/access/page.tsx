import { AlertTriangle, Trash2 } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { CopyLinkButton } from "@/components/copy-button";
import { InviteForm, ResetLinkButton } from "@/components/dashboard/invite-form";
import { AccessModeFields } from "@/components/form/access-mode-fields";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { updateAccessAction } from "@/lib/actions/portals";
import { removeUserAction } from "@/lib/actions/users";
import { requireOwnedPortal } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { portalUsers } from "@/lib/db/schema";
import { formatDate, timeAgo } from "@/lib/utils";

export default async function PortalAccessPage({ params }: PageProps<"/dashboard/portals/[portalId]/access">) {
  const { portalId } = await params;
  const { portal } = await requireOwnedPortal(portalId);
  const users =
    portal.accessMode === "email"
      ? await db.select().from(portalUsers).where(eq(portalUsers.portalId, portal.id)).orderBy(asc(portalUsers.createdAt))
      : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="How clients sign in"
          description="Switching method or changing the password signs out everyone currently signed in."
        />
        <CardBody>
          <ActionForm action={updateAccessAction} className="space-y-5">
            <input type="hidden" name="portalId" value={portal.id} />
            <AccessModeFields defaultMode={portal.accessMode} hasPassword={Boolean(portal.passwordHash)} />
            <div className="flex items-center gap-3">
              <SubmitButton>Save access settings</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Share the portal"
          description={
            portal.accessMode === "password"
              ? "Send your client this link, and send the password separately."
              : "Send each person their invite link. After that, they sign in here."
          }
        />
        <CardBody className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-[13px] text-zinc-700">
              /p/{portal.slug}
            </code>
            <CopyLinkButton path={`/p/${portal.slug}`} />
          </div>
          {!portal.isPublished && (
            <p className="flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="size-4" />
              This portal is a draft. Publish it before sharing, or clients won&apos;t be able to sign in.
            </p>
          )}
        </CardBody>
      </Card>

      {portal.accessMode === "email" && (
        <Card>
          <CardHeader
            title="People"
            description="Each invite creates a one-time link where the person chooses their password."
          />
          <CardBody className="space-y-5">
            <InviteForm portalId={portal.id} />
            {users.length === 0 ? (
              <p className="text-sm text-zinc-500">No one has been invited yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                {users.map((user) => (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{user.name || user.email}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {user.name ? `${user.email} · ` : ""}
                        {user.lastLoginAt
                          ? `Last signed in ${timeAgo(user.lastLoginAt)}`
                          : user.inviteExpiresAt
                            ? `Invite expires ${formatDate(user.inviteExpiresAt)}`
                            : "Hasn't signed in"}
                      </p>
                    </div>
                    {user.passwordHash ? <Badge tone="green">Active</Badge> : <Badge tone="amber">Invited</Badge>}
                    <ResetLinkButton portalId={portal.id} email={user.email} />
                    <ActionButton
                      action={removeUserAction}
                      fields={{ portalId: portal.id, userId: user.id }}
                      confirm={`Remove ${user.email}? They'll lose access immediately.`}
                      variant="dangerGhost"
                      size="icon"
                      aria-label={`Remove ${user.email}`}
                      title="Remove"
                    >
                      <Trash2 />
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
