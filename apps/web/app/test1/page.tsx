export default function TestPage() {
  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <video
        src="/media/bus.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-1/2 h-1/2 object-cover border border-yellow-400"
      />
    </div>
  );
}
