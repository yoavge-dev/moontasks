import { JoinClient } from "./JoinClient";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <JoinClient from={from} />
    </main>
  );
}
