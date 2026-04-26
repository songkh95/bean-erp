import type { KeyboardEvent } from "react";

type FieldTarget = HTMLElement & { id: string };

export function handleEnterToNextField(
  event: KeyboardEvent<FieldTarget>,
  order: string[],
  onLastField: () => void
): void {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) {
    return;
  }

  event.preventDefault();
  const currentId = event.currentTarget.id;
  const index = order.indexOf(currentId);
  if (index === -1) {
    return;
  }
  if (index < order.length - 1) {
    const next = document.getElementById(order[index + 1]!);
    next?.focus();
    if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
      next.select();
    }
    return;
  }
  onLastField();
}
