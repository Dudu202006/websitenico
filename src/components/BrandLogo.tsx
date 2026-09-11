type BrandLogoProps = {
  size?: 'sidebar' | 'large';
};

export function BrandLogo({ size = 'sidebar' }: BrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Le Temps d'un Délice"
      className={`brand-logo ${size === 'large' ? 'brand-logo-large' : ''}`}
    />
  );
}
