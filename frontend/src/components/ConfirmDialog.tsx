import {Button as UiButton} from './ui/Button';
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
type Confirmation = {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
};
/** Each request needs an explicit decision. Escape, backdrop and unmount all cancel. */
export function useConfirm() {
  const [pending, setPending] = useState<Confirmation>();
  const answer = useRef<((accepted: boolean) => void) | undefined>(undefined);
  const settle = useCallback((accepted: boolean) => {
    answer.current?.(accepted);
    answer.current = undefined;
    setPending(undefined);
  }, []);
  useEffect(
    () => () => {
      answer.current?.(false);
      answer.current = undefined;
    },
    [],
  );
  const confirm = useCallback((options: Confirmation) => {
    answer.current?.(false);
    setPending(options);
    return new Promise<boolean>((resolve) => {
      answer.current = resolve;
    });
  }, []);
  const dialog = pending ? (
    <Modal label={pending.title} onClose={() => settle(false)}>
      <h2>{pending.title}</h2>
      <p>{pending.description}</p>
      <div className="ui-actions">
        <UiButton
          type="button"
          variant="secondary"
          autoFocus
          onClick={() => settle(false)}
        >
          Quay lại
        </UiButton>
        <UiButton
          type="button"
          variant={pending.danger ? "danger" : "primary"}
          onClick={() => settle(true)}
        >
          {pending.confirmLabel ?? "Xác nhận"}
        </UiButton>
      </div>
    </Modal>
  ) : null;
  return { confirm, dialog };
}
