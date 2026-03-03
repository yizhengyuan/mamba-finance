interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
      <h2 className="text-xl font-semibold">Order Detail</h2>
      <p className="mt-2 text-sm text-slate-300">Current route param: {id}</p>
      <p className="mt-1 text-sm text-slate-300">
        Full order detail layout will be implemented in ISSUE-016.
      </p>
    </section>
  );
}
