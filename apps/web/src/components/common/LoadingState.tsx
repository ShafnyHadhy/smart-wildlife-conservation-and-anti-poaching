
interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading live conservation data...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-8 h-8 border-3 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
}
