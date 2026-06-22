export default function Loading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full animate-spin border-[1.5px]"
          style={{ borderColor: '#EDE7DD', borderTopColor: '#10213B' }}
        />
        <span className="text-[13px]" style={{ color: '#B6B0A8' }}>{text}</span>
      </div>
    </div>
  );
}
