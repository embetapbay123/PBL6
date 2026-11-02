import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Modal } from "./Modal";
import { ProductImage } from "./ProductImage";
import { Button } from "./ui/Button";

/** Click and keyboard access are available in addition to the desktop hover affordance. */
export function ImagePreview({ src, name }: { src: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="image-preview-trigger"
        type="button"
        aria-label={"Phóng to " + name}
        onClick={() => setOpen(true)}
      >
        <ProductImage src={src} name={name} alt={name} loading="lazy" />
        <span>
          <Maximize2 size={16} />
          Phóng to
        </span>
      </button>
      {open && (
        <Modal label={"Ảnh " + name} onClose={() => setOpen(false)}>
          <header className="modal-section-header">
            <h2>{name}</h2>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Đóng ảnh
            </Button>
          </header>
          <div className="image-preview-large">
            <ProductImage src={src} name={name} alt={name} retry />
          </div>
        </Modal>
      )}
    </>
  );
}
