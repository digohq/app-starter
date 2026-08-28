export interface AvatarButtonProps {
  initials?: string;
  imageUrl?: string;
  'aria-label'?: string;
  className?: string;
  [key: string]: unknown;
}

const AvatarButton = ({
  initials,
  imageUrl,
  'aria-label': ariaLabel = 'User menu',
  className = '',
  ...rest
}: AvatarButtonProps) => {
  const baseClass =
    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden border-0 cursor-pointer transition-opacity hover:opacity-90 bg-[var(--color-soil)] text-[var(--color-dew)]';
  const combined = [baseClass, className].filter(Boolean).join(' ');
  return (
    <button type="button" className={combined} aria-label={ariaLabel} {...rest}>
      {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : initials}
    </button>
  );
};

export default AvatarButton;
