import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";

/**
 * IMPL-20260320-11 | Respaldo: PROYECTO.md
 * Tipos técnicos donde spellCheck/autoCorrect/autoCapitalize no aportan valor y pueden perjudicar la UX.
 */
const SPELL_CHECK_EXCLUDED_TYPES = new Set<string>([
  "password", "email", "number", "date", "datetime-local",
  "time", "month", "week", "range", "file", "color",
  "url", "hidden", "checkbox", "radio", "submit", "reset",
  "button", "image", "tel",
]);

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  spellCheck: spellCheckProp,
  autoCorrect: autoCorrectProp,
  autoCapitalize: autoCapitalizeProp,
  lang,
  ...props
}: React.ComponentProps<"input">) {
  // Get dialog composition context if available (will be no-op if not inside Dialog)
  const dialogComposition = useDialogComposition();

  // Add composition event handlers to support input method editor (IME) for CJK languages.
  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLInputElement>({
    onKeyDown: (e) => {
      // Check if this is an Enter key that should be blocked
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();

      // If Enter key is pressed while composing or just after composition ended,
      // don't call the user's onKeyDown (this blocks the business logic)
      if (e.key === "Enter" && isComposing) {
        return;
      }

      // Otherwise, call the user's onKeyDown
      onKeyDown?.(e);
    },
    onCompositionStart: e => {
      dialogComposition.setComposing(true);
      onCompositionStart?.(e);
    },
    onCompositionEnd: e => {
      // Mark that composition just ended - this helps handle the Enter key that confirms input
      dialogComposition.markCompositionEnd();
      // Delay setting composing to false to handle Safari's event order
      // In Safari, compositionEnd fires before the ESC keydown event
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  const isTextual = !SPELL_CHECK_EXCLUDED_TYPES.has(type ?? "text");

  return (
    <input
      type={type}
      data-slot="input"
      spellCheck={isTextual ? (spellCheckProp ?? true) : false}
      autoCorrect={isTextual ? (autoCorrectProp ?? "on") : "off"}
      autoCapitalize={isTextual ? (autoCapitalizeProp ?? "sentences") : "none"}
      lang={lang ?? "es"}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-8 w-full min-w-0 rounded-md border bg-transparent px-2 py-1 text-xs shadow-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export { Input };
