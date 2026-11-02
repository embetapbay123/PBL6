import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, Bell, LockKeyhole, Store } from "lucide-react";
import { ConsentSettings } from "./ConsentSettings";
import { CustomerSubNav } from "./CustomerSubNav";

export const CustomerHubPage = () => {
  const [params] = useSearchParams(),
    section = ["security", "notifications", "store"].includes(
      params.get("section") ?? "",
    )
      ? params.get("section")!
      : "privacy";
  const sections = [
    { value: "privacy", label: "Quyền riêng tư", Icon: ShieldCheck },
    { value: "security", label: "Bảo mật", Icon: LockKeyhole },
    { value: "notifications", label: "Thông báo", Icon: Bell },
    { value: "store", label: "Bán hàng", Icon: Store },
  ];
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <CustomerSubNav />
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Trung tâm Khách hàng & Cài đặt
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý quyền riêng tư, sự đồng ý và các tiện ích tài khoản.
          </p>
        </div>
      </div>

      <div className="account-settings-layout">
        <nav aria-label="Danh mục cài đặt">
          {sections.map(({ value, label, Icon }) => (
            <Link
              key={value}
              to={"?section=" + value}
              aria-current={section === value ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div>
          {section === "privacy" && <ConsentSettings />}
          {section === "security" && (
            <section className="boot-card">
              <h2>Bảo mật tài khoản</h2>
              <p>Cập nhật mật khẩu hoặc quản lý tài khoản đang đăng nhập.</p>
              <div className="ui-actions">
                <Link
                  className="ui-button ui-button-secondary"
                  to="/change-password"
                >
                  Đổi mật khẩu
                </Link>
                <Link className="ui-button ui-button-secondary" to="/login">
                  Quản lý đăng nhập
                </Link>
              </div>
            </section>
          )}
          {section === "notifications" && (
            <section className="boot-card">
              <h2>Thông báo đơn hàng</h2>
              <p>
                Xem cập nhật về đơn hàng, thanh toán và đổi trả; đánh dấu thông
                báo đã đọc.
              </p>
              <Link
                className="ui-button ui-button-secondary"
                to="/customer/notifications"
              >
                Mở thông báo
              </Link>
            </section>
          )}
          {section === "store" && (
            <section className="boot-card">
              <h2>Bắt đầu bán hàng</h2>
              <p>
                Theo dõi hồ sơ mở Store hoặc nhận lời mời làm nhân viên từ chủ
                cửa hàng.
              </p>
              <div className="ui-actions">
                <Link
                  className="ui-button ui-button-secondary"
                  to="/customer/store-applications"
                >
                  Hồ sơ mở Store
                </Link>
                <Link
                  className="ui-button ui-button-secondary"
                  to="/customer/invitations"
                >
                  Xem lời mời Store
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerHubPage;
