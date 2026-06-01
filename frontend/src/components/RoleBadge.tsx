/**
 * RoleBadge — labels one of the five settlement roles.
 *
 * Oathkeeper(gold) · Client(steel) · Believer(sage) · Doubter(coral) ·
 * Platform(bone). Uses the AA-verified -deep text tokens on cream and always
 * includes the role word, so distinction never relies on hue alone.
 * Pure presentational.
 */
export type Role =
  | "Oathkeeper"
  | "Client"
  | "Believer"
  | "Doubter"
  | "Platform";

const COLORS: Record<Role, string> = {
  Oathkeeper: "var(--gold-deep)",
  Client: "var(--steel-deep)",
  Believer: "var(--sage-deep)",
  Doubter: "var(--coral-deep)",
  Platform: "var(--bone-800)",
};

export default function RoleBadge({
  role,
  size = "sm",
}: {
  role: Role;
  /** "sm" for inline labels, "xs" for dense chips. */
  size?: "sm" | "xs";
}) {
  const fontSize = size === "xs" ? "0.625rem" : "0.7rem";
  return (
    <span
      className="inline-flex items-center font-mono"
      style={{
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: COLORS[role],
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 2,
          background: COLORS[role],
          marginRight: 6,
          flexShrink: 0,
        }}
      />
      {role}
    </span>
  );
}
