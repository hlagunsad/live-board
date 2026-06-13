import BoardClient from "@/components/BoardClient";

// Next 16: dynamic-route `params` is a Promise — await it in this Server Component,
// then hand the board id (a serializable string) to the client component.
export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardClient boardId={id} />;
}
