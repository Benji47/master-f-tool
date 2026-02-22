import { Context } from "hono";

type AdminUserItem = {
  $id: string;
  name: string;
  email?: string;
};

export function AdminPasswordResetPage({
  c,
  adminUsername,
  users,
}: {
  c: Context;
  adminUsername: string;
  users: AdminUserItem[];
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-purple-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white font-[Orbitron] mb-2">Admin Panel</h1>
          <p className="text-neutral-400">Logged as {adminUsername}. Reset password for any account.</p>
        </div>

        {/* Admin Tools Navigation */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 shadow-xl mb-6">
          <h2 className="text-xl font-bold text-white mb-3 font-[Orbitron]">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="/v1/admin"
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors text-center"
            >
              🔑 Password Reset
            </a>
            <a
              href="/v1/admin/content"
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors text-center"
            >
              📝 Content Manager
            </a>
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-6 shadow-xl">
          <form id="adminResetForm" action="/v1/admin/reset-password" method="post" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="targetUserId" className="block text-sm font-medium text-neutral-200">Account</label>
              <select
                id="targetUserId"
                name="targetUserId"
                required
                className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2"
              >
                <option value="">Select account</option>
                {users.map((u) => (
                  <option key={u.$id} value={u.$id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-200">New password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                minLength={6}
                required
                placeholder="Minimum 6 characters"
                className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-200">Confirm new password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                minLength={6}
                required
                placeholder="Repeat new password"
                className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md px-3 py-2"
              />
            </div>

            <div id="adminResetError" className="text-red-400 text-sm" aria-live="polite"></div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md transition-colors"
              >
                Set New Password
              </button>
            </div>
          </form>

          <form action="/v1/auth/logout" method="post" className="pt-3">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var form = document.getElementById('adminResetForm');
              var err = document.getElementById('adminResetError');
              if (!form) return;

              form.addEventListener('submit', function(e){
                err.textContent = '';
                var pwd = document.getElementById('newPassword').value;
                var cpwd = document.getElementById('confirmPassword').value;
                if (!pwd || pwd.length < 6) {
                  e.preventDefault();
                  err.textContent = 'Password must be at least 6 characters.';
                  return;
                }
                if (pwd !== cpwd) {
                  e.preventDefault();
                  err.textContent = 'Passwords do not match.';
                  return;
                }
              });
            })();
          `,
        }}
      />
    </div>
  );
}
