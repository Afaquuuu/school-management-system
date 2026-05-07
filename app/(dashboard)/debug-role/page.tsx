import { auth } from "@clerk/nextjs/server";
import { getRoleFromClaims } from "@/lib/auth";
import Image from "next/image";

export default async function DebugRolePage() {
  const { sessionClaims } = await auth();
  const role = getRoleFromClaims(sessionClaims);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">🔍 Why Can't I See the Admin Menu?</h1>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Let's check your role and fix it!
        </p>
      </div>

      {/* Current Role - Big and Clear */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <p className="text-sm uppercase tracking-wider opacity-90">Your Current Role:</p>
        <p className="text-6xl font-black mt-2 capitalize">{role}</p>
        {role !== "admin" && (
          <p className="mt-4 text-lg bg-white/20 rounded-lg p-4">
            ⚠️ You need to be "admin" to see the Admin menu. Let's fix this below! 👇
          </p>
        )}
        {role === "admin" && (
          <p className="mt-4 text-lg bg-white/20 rounded-lg p-4">
            ✅ Perfect! You should see the Admin menu in the sidebar. If not, try refreshing the page.
          </p>
        )}
      </div>

      {/* Step by Step Instructions */}
      {role !== "admin" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-orange-500 p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-3">
            <span className="text-3xl">📝</span>
            Follow These Steps (Takes 2 Minutes)
          </h2>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-2">
                  Open Clerk Dashboard
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  Go to your Clerk dashboard in a new tab:
                </p>
                <a 
                  href="https://dashboard.clerk.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Open Clerk Dashboard →
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-2">
                  Find Your User
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Click <strong>"Users"</strong> in the left sidebar, then click on your user account (School Admin)
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-2">
                  Edit Public Metadata
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  Scroll down to find <strong>"Public metadata"</strong> section and click the <strong>"Edit"</strong> button
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-2">
                  Add This Code
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  Copy and paste this JSON code:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-x-auto">
{`{
  "role": "admin"
}`}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText('{\n  "role": "admin"\n}')}
                    className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                5
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-2">
                  Save and Refresh
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Click <strong>"Save"</strong> in Clerk, then come back here and <strong>refresh this page</strong> (press F5)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 font-semibold">
              ✨ After refreshing, your role above will change to "admin" and the Admin menu will appear in the sidebar!
            </p>
          </div>
        </div>
      )}

      {/* Technical Details (Collapsed) */}
      <details className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6">
        <summary className="font-bold text-slate-900 dark:text-slate-50 cursor-pointer">
          🔧 Technical Details (for developers)
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">Session Claims:</h3>
            <pre className="bg-slate-900 text-green-400 rounded-lg p-4 overflow-auto text-xs">
              {JSON.stringify(sessionClaims, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">How it works:</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The app checks <code>publicMetadata.role</code> from your Clerk session. 
              The sidebar navigation filters menu items based on this role. 
              Only users with role="admin" can see the Admin menu option.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
