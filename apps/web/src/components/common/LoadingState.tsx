interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading live conservation data...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-8 h-8 border-3 border-[#D1B370]/40 border-t-[#3E8E41] rounded-full animate-spin mb-4" />
      <p className="text-sm font-semibold text-stone-600">{message}</p>
    </div>
  );
}
