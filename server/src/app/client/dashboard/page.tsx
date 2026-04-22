"use client";
import { useState, useEffect } from "react";

export default function ClientDashboard() {
  const [stats, setStats] = useState({ keys: 0, requests: 0, certs: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/client/keys").then((r) => r.json()),
      fetch("/api/client/certificates").then((r) => r.json()),
    ]).then(([keys, certData]) => {
      setStats({
        keys: keys.length,
        requests: certData.requests.length,
        certs: certData.certificates.filter((c: { status: string }) => c.status === "ACTIVE").length,
        pending: certData.requests.filter((r: { status: string }) => r.status === "PENDING").length,
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-base-content/60 mt-1">Tổng quan tài khoản của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-xl border border-base-content/10 shadow-md card-hover">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <div className="stat-title">Cặp khóa</div>
          <div className="stat-value text-primary">{stats.keys}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl border border-base-content/10 shadow-md card-hover">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div className="stat-title">Yêu cầu CSR</div>
          <div className="stat-value text-secondary">{stats.requests}</div>
          <div className="stat-desc">Chờ duyệt: {stats.pending}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl border border-base-content/10 shadow-md card-hover">
          <div className="stat-figure text-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="stat-title">Chứng chỉ active</div>
          <div className="stat-value text-success">{stats.certs}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl border border-base-content/10 shadow-md card-hover">
          <div className="stat-figure text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="stat-title">Chờ duyệt</div>
          <div className="stat-value text-warning">{stats.pending}</div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-content/10 shadow-md">
        <div className="card-body">
          <h3 className="card-title">Hướng dẫn nhanh</h3>
          <ul className="steps steps-vertical text-sm">
            <li className="step step-primary">Tạo cặp khóa RSA tại mục &quot;Cặp khóa&quot;</li>
            <li className="step step-primary">Tạo yêu cầu cấp chứng chỉ (CSR) tại mục &quot;Yêu cầu chứng chỉ&quot;</li>
            <li className="step">Chờ Admin phê duyệt CSR</li>
            <li className="step">Tải chứng chỉ đã cấp tại mục &quot;Chứng chỉ của tôi&quot;</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
