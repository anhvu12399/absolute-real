/**
 * The gold disc with the A cut out of it, drawn from the sprite in V2Icons.
 *
 * Used wherever a logo image would go when WordPress has nothing usable to
 * offer. It is vector, so it is exact at 32px in a mobile menu and at 132px in
 * the header, and it is part of this bundle rather than a file on a domain
 * that is in the middle of moving.
 */
export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      style={{ flex: "none", display: "block" }}
    >
      <use href="#brand-mark" />
    </svg>
  );
}
