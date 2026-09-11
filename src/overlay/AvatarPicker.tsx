import { AVATARS } from "../shared/avatars";
import { AvatarFace } from "./AvatarFace";

export function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="avatar-picker" role="listbox" aria-label="Choose an avatar">
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          role="option"
          aria-selected={avatar.id === value}
          className={avatar.id === value ? "pick is-on" : "pick"}
          onClick={() => onChange(avatar.id)}
          title={avatar.name}
        >
          <AvatarFace avatarId={avatar.id} size={36} />
        </button>
      ))}
    </div>
  );
}
