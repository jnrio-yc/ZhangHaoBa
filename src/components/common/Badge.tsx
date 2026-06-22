interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md';
}

// Low-saturation chip colors derived from base color
function getChipStyle(color: string, variant: 'solid' | 'outline') {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  if (variant === 'solid') {
    return {
      background: `rgba(${r},${g},${b},0.09)`,
      color: color,
      border: `1px solid rgba(${r},${g},${b},0.18)`,
    };
  }
  return {
    background: 'transparent',
    color: color,
    border: `1px solid rgba(${r},${g},${b},0.28)`,
  };
}

export default function Badge({ children, color = '#6B7280', variant = 'solid', size = 'sm' }: BadgeProps) {
  const style = getChipStyle(color, variant);
  return (
    <span
      className="inline-flex items-center whitespace-nowrap font-medium"
      style={{
        ...style,
        height: size === 'sm' ? '22px' : '24px',
        padding: '0 8px',
        borderRadius: '999px',
        fontSize: '12px',
        lineHeight: '18px',
      }}
    >
      {children}
    </span>
  );
}
