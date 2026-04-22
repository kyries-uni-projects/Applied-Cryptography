"use client";

import { useState } from "react";

export default function ChangePasswordModal() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setSuccess("Đổi mật khẩu thành công!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setOpen(false), 1500);
      }
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        Đổi mật khẩu
      </button>

      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Đổi mật khẩu</h3>
            
            {error && <div className="alert alert-error mb-4 text-sm">{error}</div>}
            {success && <div className="alert alert-success mb-4 text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Mật khẩu hiện tại</span></label>
                <input type="password" className="input input-bordered w-full" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Mật khẩu mới</span></label>
                <input type="password" className="input input-bordered w-full" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Xác nhận mật khẩu mới</span></label>
                <input type="password" className="input input-bordered w-full" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="loading loading-spinner loading-sm"></span> : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
}
