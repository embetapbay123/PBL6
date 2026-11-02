import { useConfirm } from "../../components/ConfirmDialog";
import { Modal } from "../../components/Modal";
import { useCallback, useEffect, useRef, useState } from "react";
import { callOperation } from "../../api/operations";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { SellerSubNav } from "../../live/SellerWorkspace";
import { isUncertainMutation } from "../../api/client";
import {
  invitationLabels,
  invitationStatus,
  invitationTime,
  sellerPermissions,
  useInvitationClock,
} from "../staff-presentation";
type Staff = {
  id: string;
  user_id: string;
  email: string;
  status: string;
  version: number;
  permissions: string[];
};
type Invitation = {
  id: string;
  invited_email: string;
  permissions: string[];
  status: string;
  expires_at: string;
};

export function StaffPage() {
  const { confirm, dialog } = useConfirm();
  const [permissionEdit, setPermissionEdit] = useState<Staff>();
  const [tab, setTab] = useState<"staff" | "invitations">("staff");
  const [staffPage, setStaffPage] = useState(1),
    [invitePage, setInvitePage] = useState(1),
    [staffTotal, setStaffTotal] = useState(0),
    [inviteTotal, setInviteTotal] = useState(0),
    generation = useRef(0);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [loadError, setLoadError] = useState<unknown>();
  const [notice, setNotice] = useState("");
  const flight = useRef(false),
    alive = useRef(true);
  const now = useInvitationClock(invitations);
  const locked = busy || loading || loadError !== undefined;

  const load = useCallback(async () => {
    const epoch = ++generation.current;
    setLoading(true);
    setLoadError(undefined);
    try {
      const [membersPage, invitationPage] = await Promise.all([
        callOperation("listStoreStaff", {
          query: { page: staffPage, size: 20 },
        }),
        callOperation("listStaffInvitations", {
          query: { page: invitePage, size: 20 },
        }),
      ]);
      if (epoch !== generation.current) return false;
      setStaff(membersPage.items as unknown as Staff[]);
      setStaffTotal(membersPage.total);
      setInviteTotal(invitationPage.total);
      setInvitations(invitationPage.items as unknown as Invitation[]);
      if (staffPage > Math.max(1, Math.ceil(membersPage.total / 20)))
        setStaffPage(Math.max(1, Math.ceil(membersPage.total / 20)));
      if (invitePage > Math.max(1, Math.ceil(invitationPage.total / 20)))
        setInvitePage(Math.max(1, Math.ceil(invitationPage.total / 20)));
      return true;
    } catch (cause) {
      if (epoch === generation.current) setLoadError(cause);
      return false;
    } finally {
      if (epoch === generation.current) setLoading(false);
    }
  }, [staffPage, invitePage]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function mutate(
    command: () => Promise<unknown>,
    success: string,
    onSuccess?: () => void,
  ) {
    if (flight.current || locked) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    setNotice("");
    try {
      await command();
      if (!alive.current) return;
      onSuccess?.();
      setNotice(success);
      await load();
      return true;
    } catch (cause) {
      if (!alive.current) return;
      setError(cause);
      if (isUncertainMutation(cause))
        setNotice(
          "Chưa rõ kết quả thao tác. Đọc lại danh sách để đối chiếu; hệ thống không tự gửi lại lệnh.",
        );
      await load();
      return false;
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    await mutate(
      () =>
        callOperation("inviteStaff", {
          body: {
            invited_email: email,
            permissions: invitePermissions as (
              | "product.store.read_write"
              | "inventory.store.read_adjust"
              | "order.store.read_status_cancel"
              | "cod.store.collect"
            )[],
          },
        }),
      "Đã tạo lời mời. Người nhận có thể xem trong mục lời mời của tài khoản.",
      () => {
        setEmail("");
        setInvitePermissions([]);
        setInvitePage(1);
      },
    );
  };

  const update = async (
    member: Staff,
    changes: { status?: string; permissions?: string[] },
  ) => {
    if (
      changes.status === "LOCKED" &&
      !(await confirm({
        title: "Khóa nhân viên?",
        description: `${member.email} sẽ không thể thực hiện công việc trong Store này bằng các quyền đang được cấp. Bạn có thể mở khóa lại sau.`,
        confirmLabel: "Khóa nhân viên",
      }))
    )
      return false;
    return await mutate(
      () =>
        callOperation("updateStaff", {
          path: { id: member.id },
          body: {
            expected_version: member.version,
            status: changes.status as "ACTIVE" | "LOCKED" | undefined,
            permissions: changes.permissions,
          },
        }),
      "Đã cập nhật nhân viên. Danh sách dưới đây thể hiện quyền hiện hành.",
    );
  };
  const revoke = async (invitation: Invitation) => {
    if (invitationStatus(invitation, Date.now()) !== "PENDING") return;
    if (
      !(await confirm({
        title: "Thu hồi lời mời?",
        description: `${invitation.invited_email} sẽ không thể chấp nhận lời mời này.`,
        confirmLabel: "Thu hồi lời mời",
      }))
    )
      return;
    await mutate(
      () =>
        callOperation("revokeStaffInvitation", { path: { id: invitation.id } }),
      "Đã thu hồi lời mời.",
    );
  };

  return (
    <main className="boot-card">
      <SellerSubNav />
      {dialog}
      <nav
        className="workspace-sections"
        aria-label="Khu vực quản lý nhân viên"
      >
        <button
          type="button"
          aria-pressed={tab === "staff"}
          onClick={() => setTab("staff")}
        >
          Nhân viên ({staffTotal})
        </button>
        <button
          type="button"
          aria-pressed={tab === "invitations"}
          onClick={() => setTab("invitations")}
        >
          Lời mời ({inviteTotal})
        </button>
      </nav>
      {permissionEdit && (
        <PermissionEditor
          member={permissionEdit}
          busy={locked}
          error={error ?? loadError}
          close={() => setPermissionEdit(undefined)}
          save={async (permissions) => {
            if (await update(permissionEdit, { permissions }))
              setPermissionEdit(undefined);
          }}
        />
      )}
      <h2>Quản lý nhân viên Store</h2>
      {error !== undefined && <ErrorView error={error} />}
      {loadError !== undefined && (
        <ErrorView error={loadError} onRetry={() => void load()} />
      )}
      {notice && <p role="status">{notice}</p>}
      {tab === "invitations" && (
        <form onSubmit={invite}>
          <h3>Mời nhân viên</h3>
          <label>
            Email nhân viên{" "}
            <input
              disabled={locked}
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <fieldset disabled={locked}>
            <legend>Quyền được cấp</legend>
            {sellerPermissions.map(([code, label]) => (
              <label key={code} className="permission-option">
                <input
                  type="checkbox"
                  checked={invitePermissions.includes(code)}
                  onChange={(event) =>
                    setInvitePermissions((current) =>
                      event.target.checked
                        ? [...current, code]
                        : current.filter((item) => item !== code),
                    )
                  }
                />{" "}
                {label}
              </label>
            ))}
          </fieldset>
          <button disabled={locked}>Gửi lời mời</button>
        </form>
      )}
      {loading ? (
        <Loading />
      ) : loadError ? null : (
        <>
          {tab === "staff" && (
            <>
              <h3>Nhân viên</h3>
              <p>
                SELLER là nhân viên của Store này; các quyền dưới đây không cấp
                quyền Owner hoặc quản trị toàn sàn.
              </p>
              {staff.length === 0 ? (
                <p>Không có nhân viên ở trang này.</p>
              ) : (
                staff.map((member) => (
                  <article key={member.id} className="boot-card">
                    <strong>{member.email}</strong> ·{" "}
                    {member.status === "ACTIVE"
                      ? "Đang hoạt động"
                      : member.status === "LOCKED"
                        ? "Đã khóa"
                        : member.status}
                    <ul>
                      {member.permissions.map((code) => (
                        <li key={code}>
                          {sellerPermissions.find(([p]) => p === code)?.[1] ??
                            "Quyền khác do hệ thống quản lý"}
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={locked || member.status !== "ACTIVE"}
                      onClick={() => {
                        setError(undefined);
                        setPermissionEdit(member);
                      }}
                    >
                      Sửa quyền
                    </button>
                    <button
                      disabled={locked}
                      onClick={() =>
                        update(member, {
                          status:
                            member.status === "ACTIVE" ? "LOCKED" : "ACTIVE",
                        })
                      }
                    >
                      {member.status === "ACTIVE"
                        ? "Khóa nhân viên"
                        : "Mở khóa"}
                    </button>
                  </article>
                ))
              )}
              <fieldset disabled={locked}>
                <legend>Trang nhân viên</legend>
                <Pagination
                  page={staffPage}
                  size={20}
                  total={staffTotal}
                  onPage={setStaffPage}
                />
              </fieldset>
            </>
          )}
          {tab === "invitations" && (
            <>
              <h3>Lời mời</h3>
              {invitations.length === 0 ? (
                <p>Không có lời mời ở trang này.</p>
              ) : (
                invitations.map((invitation) => (
                  <article key={invitation.id}>
                    {invitation.invited_email} ·{" "}
                    {invitationLabels[invitationStatus(invitation, now)] ??
                      "Chưa rõ trạng thái"}{" "}
                    · hết hạn {invitationTime(invitation.expires_at)}
                    {invitationStatus(invitation, now) === "PENDING" && (
                      <button
                        disabled={locked}
                        onClick={() => revoke(invitation)}
                      >
                        Thu hồi
                      </button>
                    )}
                  </article>
                ))
              )}
              <fieldset disabled={locked}>
                <legend>Trang lời mời</legend>
                <Pagination
                  page={invitePage}
                  size={20}
                  total={inviteTotal}
                  onPage={setInvitePage}
                />
              </fieldset>
            </>
          )}
        </>
      )}
    </main>
  );
}

function PermissionEditor({
  member,
  busy,
  close,
  save,
  error,
}: {
  member: Staff;
  error?: unknown;
  busy: boolean;
  close: () => void;
  save: (permissions: string[]) => Promise<void>;
}) {
  const [draft, setDraft] = useState([...member.permissions]);
  return (
    <Modal label="Sửa quyền nhân viên" busy={busy} onClose={close}>
      <h2>Sửa quyền nhân viên</h2>
      <p>{member.email}</p>
      <p>
        Thay đổi chỉ có hiệu lực trong Store hiện hành khi bấm Lưu quyền. Bỏ
        tick một quyền sẽ thu hồi công việc tương ứng.
      </p>
      {error != null && (
        <>
          <ErrorView error={error} />
          <p>
            Đóng hộp sửa để kiểm tra danh sách mới trước khi lưu lại. Bản nháp
            chưa được xác nhận.
          </p>
        </>
      )}
      <fieldset disabled={busy || error != null}>
        <legend>Quyền trong Store</legend>
        {sellerPermissions.map(([code, label]) => (
          <label className="permission-option" key={code}>
            <input
              type="checkbox"
              checked={draft.includes(code)}
              onChange={(e) =>
                setDraft((value) =>
                  e.target.checked
                    ? [...value, code]
                    : value.filter((p) => p !== code),
                )
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="ui-actions">
        <button disabled={busy} onClick={close}>
          Bỏ thay đổi
        </button>
        <button
          disabled={busy || error != null}
          onClick={() => void save(draft)}
        >
          Lưu quyền
        </button>
      </div>
    </Modal>
  );
}
