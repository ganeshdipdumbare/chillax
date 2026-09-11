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
        background: `linear-gradient(145deg, ${avatar.from}, ${avatar.to})`,
        boxShadow: `0 0 0 1px rgb(255 255 255 / 0.18), 0 8px 18px ${avatar.to}66`,
      }}
    >
      <span aria-hidden="true">{avatar.emoji}</span>
    </span>
  );
}
