import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function Input({
  className,
  type,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ref,
  ...props
}: React.ComponentProps<"input"> & { ref?: React.Ref<HTMLInputElement> }) {
  const dialogComposition = useDialogComposition();
  
  // Ref unificada
  const innerRef = React.useRef<HTMLInputElement>(null);
  const mergedRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [ref]
  );

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
      dialogComposition.markCompositionEnd();
      setTimeout(() => {
        dialogComposition.setComposing(false);
      }, 100);
      onCompositionEnd?.(e);
    },
  });

  const improveMutation = trpc.system.improveText.useMutation({
    onSuccess: (data) => {
      const el = innerRef.current;
      if (!el) return;
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, data.improvedText);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.value = data.improvedText;
        if (props.onChange) {
          props.onChange({ target: el } as any);
        }
      }
      toast.success("Redacción mejorada con IA ✨");
    },
    onError: (err) => {
      toast.error(err.message || "Error al mejorar el texto");
    }
  });

  const handleImprove = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const val = innerRef.current?.value || String(props.value || "");
    if (!val || val.trim().length === 0) {
      toast.info("No hay texto para mejorar");
      return;
    }
    improveMutation.mutate({ text: val });
  }, [improveMutation, props.value]);

  // Mostrar el botón en inputs que sean de texto, de búsqueda o sin tipo definido
  const isTextBased = !type || type === "text" || type === "search" || type === "url";

  return (
    <div className="relative w-full">
      <input
        ref={mergedRef}
        type={type}
        data-slot="input"
        spellCheck={props.spellCheck ?? true}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          isTextBased && "pr-8",
          className
        )}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        {...props}
      />
      {isTextBased && (
        <button
          type="button"
          tabIndex={-1}
          onClick={handleImprove}
          disabled={improveMutation.isPending || props.disabled}
          title="Mejorar redacción con IA"
          className="absolute top-1/2 -translate-y-1/2 right-1 text-muted-foreground hover:text-blue-500 transition-colors disabled:opacity-50 p-1 bg-background/80 rounded-md shadow-sm border border-transparent hover:border-border hover:bg-background z-10"
        >
          {improveMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

export { Input };
