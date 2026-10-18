import { TrackFormClient } from "../TrackFormClient";

export default function EditTrackPage({ params }: { params: { id: string } }) {
  return <TrackFormClient trackId={params.id} />;
}
