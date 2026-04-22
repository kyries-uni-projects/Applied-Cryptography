import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  const [totalUsers, totalCerts, pendingRequests, pendingRevocations, activeCerts, revokedCerts] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.certificate.count(),
    prisma.certificateRequest.count({ where: { status: "PENDING" } }),
    prisma.revocationRequest.count({ where: { status: "PENDING" } }),
    prisma.certificate.count({ where: { status: "ACTIVE" } }),
    prisma.certificate.count({ where: { status: "REVOKED" } }),
  ]);

  const recentLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const caConfig = await prisma.caConfig.findFirst();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-base-content/60 mt-1">Tổng quan hệ thống Certificate Authority</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm card-hover">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div className="stat-title">Người dùng</div>
          <div className="stat-value text-primary">{totalUsers}</div>
          <div className="stat-desc">Tổng số client đăng ký</div>
        </div>

        <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm card-hover">
          <div className="stat-figure text-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="stat-title">Chứng chỉ Active</div>
          <div className="stat-value text-success">{activeCerts}</div>
          <div className="stat-desc">Tổng: {totalCerts} | Thu hồi: {revokedCerts}</div>
        </div>

        <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm card-hover">
          <div className="stat-figure text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="stat-title">CSR chờ duyệt</div>
          <div className="stat-value text-warning">{pendingRequests}</div>
          <div className="stat-desc">Yêu cầu cấp chứng chỉ</div>
        </div>

        <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm card-hover">
          <div className="stat-figure text-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <div className="stat-title">Thu hồi chờ duyệt</div>
          <div className="stat-value text-error">{pendingRevocations}</div>
          <div className="stat-desc">Yêu cầu thu hồi chứng chỉ</div>
        </div>
      </div>

      {/* CA Config Summary */}
      {caConfig && (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <h3 className="card-title text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Cấu hình CA hiện tại
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div>
                <p className="text-xs text-base-content/50 uppercase tracking-wide">Thuật toán</p>
                <p className="font-semibold">{caConfig.algorithm}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/50 uppercase tracking-wide">Hàm băm</p>
                <p className="font-semibold">{caConfig.hashAlgorithm}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/50 uppercase tracking-wide">Độ dài khóa</p>
                <p className="font-semibold">{caConfig.keyLength} bits</p>
              </div>
              <div>
                <p className="text-xs text-base-content/50 uppercase tracking-wide">Hiệu lực</p>
                <p className="font-semibold">{caConfig.validityDays} ngày</p>
              </div>
            </div>
            <div className="mt-2">
              <span className={`badge ${caConfig.rootCertPem ? "badge-success" : "badge-warning"} gap-1`}>
                <span className={`status-dot ${caConfig.rootCertPem ? "status-active" : "status-pending"}`}></span>
                {caConfig.rootCertPem ? "Root Certificate đã tạo" : "Chưa tạo Root Certificate"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Hoạt động gần đây
          </h3>
          {recentLogs.length === 0 ? (
            <p className="text-base-content/50 text-sm py-4">Chưa có hoạt động nào</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người dùng</th>
                    <th>Hành động</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover">
                      <td className="text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                      <td><span className="badge badge-ghost badge-sm">{log.username}</span></td>
                      <td><span className="font-mono text-xs">{log.action}</span></td>
                      <td className="text-xs text-base-content/70 max-w-xs truncate">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
