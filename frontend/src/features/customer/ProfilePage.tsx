import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import { CustomerSubNav } from "./CustomerSubNav";
import { useQueryClient } from "@tanstack/react-query";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";

interface Profile {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
}

type ProfileUpdate = {
  display_name?: string;
  phone?: string;
};

const describeError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    return error.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.";
  }
  return "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
};

export const ProfilePage: React.FC = () => {
  const cache = useQueryClient();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [original, setOriginal] = useState<{
    displayName: string;
    phone: string;
  }>();
  useUnsavedChanges(
    saving ||
      (!!original &&
        (displayName !== original.displayName || phone !== original.phone)),
  );

  const mounted = useRef(true);
  const savedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(savedTimer.current);
    };
  }, []);

  const fetchProfile = useCallback(async (): Promise<Profile> => {
    const profile = await callOperation("getProfile", {});
    if (mounted.current) {
      setEmail(profile.email);
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
      setOriginal({
        displayName: profile.display_name ?? "",
        phone: profile.phone ?? "",
      });
    }
    return {
      id: profile.user_id,
      email: profile.email,
      display_name: profile.display_name ?? "",
      phone: profile.phone ?? null,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await fetchProfile();
    } catch (error) {
      if (mounted.current) setLoadError(describeError(error));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!displayName.trim()) {
      setSaveError("Tên hiển thị không được chỉ chứa khoảng trắng.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setIsSaved(false);
    window.clearTimeout(savedTimer.current);

    const payload: ProfileUpdate = {};
    const trimmedName = displayName.trim();
    if (trimmedName) {
      payload.display_name = trimmedName;
    }
    payload.phone = phone.trim(); // send string, never null

    try {
      const saved = await callOperation("updateProfile", {
        body: payload,
      });
      if (mounted.current) {
        cache.setQueryData(["profile", saved.user_id], saved);
        setDisplayName(saved.display_name ?? "");
        setPhone(saved.phone ?? "");
        setOriginal({
          displayName: saved.display_name ?? "",
          phone: saved.phone ?? "",
        });
      }
      await cache.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) {
      if (mounted.current) setSaveError(describeError(error));
      if (mounted.current) setSaving(false);
      return;
    }

    try {
      await fetchProfile();
      if (mounted.current) {
        setIsSaved(true);
        savedTimer.current = window.setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (error) {
      if (mounted.current) {
        setSaveError(
          "Đã lưu nhưng không thể tải lại thông tin mới nhất. " +
            describeError(error),
        );
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl" role="status">
        <p className="text-sm text-gray-600">Đang tải thông tin cá nhân...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div
          role="alert"
          className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg"
        >
          {loadError}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <CustomerSubNav />

      <h1 className="text-2xl font-bold mb-6">Thông tin cá nhân</h1>

      {isSaved && (
        <div
          role="status"
          className="mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg"
        >
          Cập nhật thông tin thành công!
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg"
        >
          {saveError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded-lg p-6 space-y-4"
      >
        <fieldset disabled={saving} className="space-y-4">
          <div>
            <label
              htmlFor="profile-display-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tên hiển thị
            </label>
            <input
              id="profile-display-name"
              type="text"
              maxLength={200}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              aria-describedby="profile-email-hint"
              value={email}
              disabled
              className="w-full border rounded-md p-2 bg-gray-100 cursor-not-allowed"
            />
          </div>

          <p id="profile-email-hint">
            Email đăng nhập không thể thay đổi tại đây.
          </p>
          <Link to="/change-password">Đổi mật khẩu</Link>
          <div>
            <label
              htmlFor="profile-phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Số điện thoại
            </label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </fieldset>
      </form>
    </div>
  );
};

export default ProfilePage;
