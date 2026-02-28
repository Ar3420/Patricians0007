import { requireAuth } from "@/src/lib/auth/requireAuth";
import { getLedgerData } from "@/src/lib/data/patricians";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  await requireAuth();
  const data = await getLedgerData();

  return (
    <section className="helix-panel rounded-2xl p-4">
      <h1 className="mb-3 text-3xl">Ledger / Audit Trail</h1>
      {data.events.length === 0 ? (
        <p className="text-sm text-[#667183]">No ledger events yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[#465264]">
            <thead className="text-[#6a7483]">
              <tr>
                <th className="px-2 py-1">Timestamp</th>
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.id} className="border-t border-[var(--helix-border)]/70">
                  <td className="px-2 py-1">{new Date(event.time).toLocaleString()}</td>
                  <td className="px-2 py-1">{event.type}</td>
                  <td className="px-2 py-1">{event.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
