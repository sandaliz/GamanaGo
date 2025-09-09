import ResultsPageClient from "./ResultsPageClient";

export default function DirectionsPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string; depart_in?: string };
}) {
  const from = searchParams?.from || "";
  const to = searchParams?.to || "";
  const departIn = Number(searchParams?.depart_in ?? 0);

  return (
    <div className="p-6">
      <ResultsPageClient fromInit={from} toInit={to} departInInit={departIn} />
    </div>
  );
}
