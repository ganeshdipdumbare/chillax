import { getAvatar } from "../shared/avatars";

export function AvatarFace({
  avatarId,
  size = 32,
  title,
}: {
  avatarId?: string | null;
  size?: number;
  title?: string;
}) {
  const avatar = getAvatar(avatarId);
  return (
    <span
      className="face"
      title={title || avatar.name}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.52,
        background: avatar.fill,
        boxShadow: "inset 0 0 0 1px var(--face-ring, rgb(14 17 19 / 0.08))",
      }}
    >
      <span aria-hidden="true">{avatar.emoji}</span>
    </span>
  );
}
