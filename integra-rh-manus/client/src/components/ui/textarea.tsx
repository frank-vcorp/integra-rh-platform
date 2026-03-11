import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function Textarea({
  className,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  ref,
  ...props
}: React.ComponentProps<"textarea"> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  const dialogComposition = useDialogComposition();
  
  // Ref unificada
  const innerRef = React.useRef<HTMLTextAreaElement>(null);
  const mergedRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [ref]
  );

  const {
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onKeyDown: handleKeyDown,
  } = useComposition<HTMLTextAreaElement>({
    onKeyDown: (e) => {
      const isComposing = (e.nativeEvent as any).isComposing || dialogComposition.justEndedComposing();
      if (e.key === "Enter" && !e.shiftKey && isComposing) {
        return;
      }
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
        window.HTMLTextAreaElement.prototype,
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

  return (
    <div className="relative w-full field-sizing-content min-w-0">
      <textarea
        ref={mergedRef}
        data-slot="textarea"
        spellCheck={props.spellCheck ?? true}
        lang={props.lang ?? "es"}
        autoCorrect={props.autoCorrect ?? "on"}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-9",
          className
        )}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        {...props}
      />
      
      {/* Botón Mágico AI */}
      <button
        type="button"
        tabIndex={-1}
        onClick={handleImprove}
        disabled={improveMutation.isPending || props.disabled}
        title="Mejorar redacción con IA"
        className="absolute bottom-2 right-2 text-muted-foreground hover:text-blue-500 transition-colors disabled:opacity-50 p-1 bg-background/80 rounded-md shadow-sm border border-transparent hover:border-border hover:bg-background z-10"
      >
        {improveMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export { Textarea };
