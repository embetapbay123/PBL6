import { useConfirm } from "../../components/ConfirmDialog";
import { PermissionPresets } from "./PermissionPresets";
import { Modal } from "../../components/Modal";
import { ActionMenu } from "../../components/ActionMenu";
import { Button } from "../../components/ui/Button";
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
  const [inviteOpen,setInviteOpen]=useState(false);
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
        setTab("invitations");
        setInviteOpen(false);
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
        danger: true,
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
      <header className="seller-staff-heading">
        <h1>Quản lý nhân viên Store</h1>
        <Button aria-expanded={inviteOpen} aria-controls="staff-invite-form" disabled={locked} onClick={() => setInviteOpen(value => !value)}>
          {inviteOpen ? "Thu gọn" : "Mời nhân viên"}
        </Button>
      </header>
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
      {error !== undefined && <ErrorView error={error} />}
      {loadError !== undefined && (
        <ErrorView error={loadError} onRetry={() => void load()} />
      )}
      {notice && <p role="status">{notice}</p>}
      {inviteOpen && (
        <form id="staff-invite-form" className="staff-invite-form" onSubmit={invite}>
          <h3>Mời nhân viên</h3>
          <label>
            Email nhân viên{" "}
            <input
              autoFocus
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
            <StaffPermissionScope />
            <PermissionPresets
              disabled={locked}
              onChange={setInvitePermissions}
            />
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
              {staff.length === 0 ? (
                <div className="seller-empty-state"><p>Chưa có nhân viên.</p></div>
              ) : (
                <div className="market-table-scroll seller-staff-table-scroll">
                  <table className="seller-staff-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28%' }}>Nhân viên</th>
                        <th style={{ width: '16%' }}>Trạng thái</th>
                        <th>Quyền hạn</th>
                        <th style={{ width: '22%', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member) => (
                        <tr key={member.id} role="article" className="seller-staff-row">
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="seller-staff-avatar" aria-hidden="true">{member.email.slice(0,1).toUpperCase()}</span>
                              <div>
                                <strong>{member.email}</strong>
                                <br />
                                <small style={{ color: '#94a3b8', fontSize: '11px' }}>ID: {member.id.slice(0, 8)}…</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={'seller-status '+(member.status==='ACTIVE'?'is-active':'is-inactive')}>
                              {member.status === "ACTIVE"
                                ? "Đang hoạt động"
                                : member.status === "LOCKED"
                                  ? "Đã khóa"
                                  : member.status}
                            </span>
                          </td>
                          <td>
                            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#475569' }}>
                              {member.permissions.map((code) => (
                                <li key={code}>
                                  {sellerPermissions.find(([p]) => p === code)?.[1] ??
                                    "Quyền khác do hệ thống quản lý"}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="ui-actions seller-staff-actions">
                              {member.status === "ACTIVE" ? (
                                <>
                                  <Button variant="secondary" disabled={locked} onClick={() => {
                                    setError(undefined);
                                    setPermissionEdit(member);
                                  }}>
                                    Sửa quyền
                                  </Button>
                                  <ActionMenu label={`Thêm thao tác cho ${member.email}`} triggerText="Thêm" disabled={locked}>
                                    <Button className="staff-lock-action" variant="secondary" disabled={locked} onClick={() => void update(member, { status: "LOCKED" })}>
                                      Khóa nhân viên
                                    </Button>
                                  </ActionMenu>
                                </>
                              ) : (
                                <Button variant="secondary" disabled={locked} onClick={() => void update(member, { status: "ACTIVE" })}>
                                  Mở khóa
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {staffTotal > 20 && <nav aria-label="Trang nhân viên">
                <Pagination
                  disabled={locked}
                  page={staffPage}
                  size={20}
                  total={staffTotal}
                  onPage={setStaffPage}
                />
              </nav>}
            </>
          )}
          {tab === "invitations" && (
            <>
              <h3>Lời mời</h3>
              {invitations.length === 0 ? (
                <div className="seller-empty-state"><p>Chưa có lời mời.</p></div>
              ) : (
                <div className="market-table-scroll seller-staff-table-scroll">
                  <table className="seller-invitations-table">
                    <thead>
                      <tr>
                        <th style={{ width: '30%' }}>Email nhận lời mời</th>
                        <th style={{ width: '18%' }}>Trạng thái</th>
                        <th style={{ width: '22%' }}>Thời hạn</th>
                        <th>Quyền dự kiến</th>
                        <th style={{ width: '14%', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((invitation) => (
                        <tr key={invitation.id} role="article" className="seller-invitation-row">
                          <td>
                            <strong>{invitation.invited_email}</strong>
                          </td>
                          <td>
                            <span className={'seller-status '+(invitationStatus(invitation,now)==='PENDING'?'is-active':'is-inactive')}>
                              {invitationLabels[invitationStatus(invitation, now)] ?? "Chưa rõ trạng thái"}
                            </span>
                          </td>
                          <td>
                            <small style={{ color: '#64748b' }}>hết hạn {invitationTime(invitation.expires_at)}</small>
                          </td>
                          <td>
                            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#475569' }}>
                              {invitation.permissions.map((code) => (
                                <li key={code}>
                                  {sellerPermissions.find(([p]) => p === code)?.[1] ?? code}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {invitationStatus(invitation, now) === "PENDING" && (
                              <button
                                disabled={locked}
                                onClick={() => revoke(invitation)}
                              >
                                Thu hồi
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {inviteTotal > 20 && <nav aria-label="Trang lời mời">
                <Pagination
                  disabled={locked}
                  page={invitePage}
                  size={20}
                  total={inviteTotal}
                  onPage={setInvitePage}
                />
              </nav>}
            </>
          )}
        </>
      )}
    </main>
  );
}

function StaffPermissionScope() {
  return (
    <details className="staff-permission-scope">
      <summary>Phạm vi quyền</summary>
      <p>Quyền cấp cho nhân viên chỉ áp dụng trong gian hàng này. Nhân viên không có quyền của chủ gian hàng hoặc quản trị sàn.</p>
    </details>
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
        Bỏ chọn để thu hồi quyền. Bấm Lưu quyền để áp dụng.
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
        <StaffPermissionScope />
        <PermissionPresets
          disabled={busy || error != null}
          onChange={setDraft}
        />
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
