interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

const DefaultIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C2BDB5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function EmptyState({ title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8">
      <div className="mb-5 opacity-70">
        <DefaultIcon />
      </div>
      <h3 className="text-[16px] font-medium mb-2" style={{ color: '#374151' }}>{title}</h3>
      {description && (
        <p className="text-[14px] mb-6 text-center max-w-[300px] leading-[22px]" style={{ color: '#9CA3AF' }}>
          {description}
        </p>
      )}
      <div className="flex items-center gap-3">
        {action && (
          <button className="btn-primary" onClick={action.onClick}>
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button className="btn-secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
