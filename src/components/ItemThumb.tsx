import { Dokkaebi } from "./Dokkaebi";
import { useItemImages } from "@/lib/items-store";

export function ItemThumb({ id, name, size = 80, className }: { id: string; name?: string; size?: number; className?: string }) {
  const { photo, characterUrl } = useItemImages(id);
  const src = characterUrl || photo;
  if (src) {
    return <img src={src} alt={name || "물건"} className={className ?? "size-full object-cover"} />;
  }
  return (
    <div className={className ?? "flex size-full items-center justify-center"}>
      <Dokkaebi size={size} />
    </div>
  );
}