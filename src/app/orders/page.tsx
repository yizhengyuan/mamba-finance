import Link from "next/link";

export default function OrdersPage() {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
      <h2 className="text-xl font-semibold">Orders</h2>
      <p className="mt-2 text-sm text-slate-300">
        Order list UI will be implemented in ISSUE-014 and ISSUE-015.
      </p>
      <div className="mt-5">
        <Link
          href="/orders/demo-order-id"
          className="inline-flex rounded-md border border-white/20 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
        >
          Open order detail route
        </Link>
      </div>
    </section>
  );
}
