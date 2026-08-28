export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  );
}
