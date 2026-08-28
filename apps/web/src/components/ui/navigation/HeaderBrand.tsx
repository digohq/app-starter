import type { ElementType, ReactNode } from 'react';

export interface HeaderBrandProps {
  to?: string;
  href?: string;
  logoSrc?: string;
  logoAlt?: string;
  brandName?: ReactNode;
  logoHeight?: number | null;
  isCustomLogo?: boolean;
  as?: ElementType;
  className?: string;
  [key: string]: unknown;
}

const HeaderBrand = ({
  to,
  href,
  logoSrc,
  logoAlt = 'Logo',
  brandName,
  logoHeight,
  isCustomLogo,
  as: Component = 'a',
  className = '',
  ...rest
}: HeaderBrandProps) => {
  const linkProps = to != null ? { to } : { href: href ?? '#' };
  const baseClass =
    'flex items-center gap-2 hover:opacity-80 transition-opacity text-[var(--color-soil)]';
  const combined = [baseClass, className].filter(Boolean).join(' ');
  return (
    <Component className={combined} {...linkProps} {...rest}>
      {logoSrc && (
        <img
          src={logoSrc}
          alt={logoAlt}
          className={
            logoHeight
              ? 'w-auto flex-shrink-0'
              : isCustomLogo
                ? 'max-h-10 w-auto object-contain flex-shrink-0'
                : 'w-7 h-7 flex-shrink-0'
          }
          style={logoHeight ? { height: `${logoHeight}px`, maxHeight: '40px' } : undefined}
        />
      )}
      {brandName != null && <span className="text-lg font-bold">{brandName}</span>}
    </Component>
  );
};

export default HeaderBrand;
