// The input area: text box, upload, samples menu, check. While a file is being read, every input is locked, and a
// result that arrives after the user moved on (another sample, another file, remove) is discarded.
import { useEffect, useRef, useState } from "react";
import type { ReadMethod } from "../ai/readDocument";
import { T, type UiLang } from "./i18n";
import { SAMPLE_CONTRACT, SAMPLE_POST } from "./samples";

interface Source {
  name: string;
  preview?: string;
  state: "reading" | "done" | "failed";
  status: string; // progress text while reading
  method?: ReadMethod;
  pages?: number;
}

export default function Composer({
  lang,
  text,
  setText,
  onCheck,
}: {
  lang: UiLang;
  text: string;
  setText: (t: string) => void;
  onCheck: () => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emptyError, setEmptyError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0); // increments whenever the input changes hands; stale reads compare against it
  const reading = source?.state === "reading";

  async function readFile(file: File) {
    const id = ++seq.current;
    setEmptyError(false);
    setText("");
    setSource({ name: file.name, state: "reading", status: T.readingPdf[lang] });
    const isImage = file.type.startsWith("image/");
    const localPreview = isImage ? URL.createObjectURL(file) : undefined; // instant preview while reading
    if (localPreview) setSource((s) => s && { ...s, preview: localPreview });
    try {
      const { readDocument } = await import("../ai/readDocument");
      const r = await readDocument(file, (stage, f) => {
        if (seq.current !== id) return;
        const status = stage === "pdf" ? T.readingPdf[lang] : stage === "nano" ? T.readingNano[lang] : T.readingOcr[lang](Math.round((f ?? 0) * 100));
        setSource((s) => s && { ...s, status });
      });
      if (seq.current !== id) return; // user moved on: discard
      if (!r.text.trim()) throw new Error("empty");
      setText(r.text);
      setSource({ name: file.name, preview: r.preview, state: "done", status: "", method: r.method, pages: r.pages });
    } catch {
      if (seq.current === id) setSource((s) => s && { ...s, state: "failed" });
    } finally {
      if (localPreview) setTimeout(() => URL.revokeObjectURL(localPreview), 0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function pickSample(kind: "contract" | "post" | "photo") {
    setMenuOpen(false);
    setEmptyError(false);
    if (kind === "photo") {
      fetch("/samples/sample-contract-photo.png")
        .then((r) => r.blob())
        .then((b) => readFile(new File([b], "sample-contract-photo.png", { type: "image/png" })));
      return;
    }
    seq.current++;
    setSource(null);
    setText(kind === "contract" ? SAMPLE_CONTRACT : SAMPLE_POST);
  }

  function removeSource() {
    seq.current++;
    setSource(null);
    setText("");
  }

  function check() {
    if (!text.trim()) return setEmptyError(true);
    onCheck();
  }

  return (
    <>
      <div className="k-composer">
        <label htmlFor="k-text">{T.inputLabel[lang]}</label>
        {source && <SourceCard source={source} lang={lang} onRemove={removeSource} />}
        <textarea
          id="k-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={reading ? "" : T.placeholder[lang]}
          readOnly={reading}
          aria-busy={reading}
          spellCheck={false}
          aria-describedby="k-privacy"
        />
        <div className="k-composer-bar">
          <div className="k-tools">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
            <button className="k-tool" disabled={reading} onClick={() => fileRef.current?.click()}>
              <UploadIcon />
              {T.upload[lang]}
            </button>
            <SampleMenu lang={lang} open={menuOpen} setOpen={setMenuOpen} disabled={reading} onPick={pickSample} />
          </div>
          <button className="k-btn k-check" onClick={check} disabled={reading}>
            {T.check[lang]}
          </button>
        </div>
      </div>
      {emptyError && (
        <p className="k-error" role="alert">
          {T.emptyInput[lang]}
        </p>
      )}
    </>
  );
}

function SourceCard({ source, lang, onRemove }: { source: Source; lang: UiLang; onRemove: () => void }) {
  return (
    <div className="k-source" data-state={source.state}>
      <div className="k-source-thumb">{source.preview ? <img src={source.preview} alt="" /> : <span className="k-thumb-blank" aria-hidden="true" />}</div>
      <div className="k-source-info">
        <span className="k-source-name" title={source.name}>
          {source.name}
          {source.pages && source.pages > 1 ? ` (${source.pages} ${lang === "tl" ? "pages" : "pages"})` : ""}
        </span>
        {source.state === "reading" && (
          <span className="k-source-status k-reading" role="status">
            {source.status}
          </span>
        )}
        {source.state === "done" && source.method && (
          <span className="k-source-status" role="status">
            {T.readBy[source.method][lang]} {T.proofread[lang]}
          </span>
        )}
        {source.state === "failed" && (
          <span className="k-source-status k-source-failed" role="alert">
            {T.readFailed[lang]}
          </span>
        )}
      </div>
      <button className="k-link k-source-remove" onClick={onRemove}>
        {T.remove[lang]}
      </button>
    </div>
  );
}

function SampleMenu({
  lang,
  open,
  setOpen,
  disabled,
  onPick,
}: {
  lang: UiLang;
  open: boolean;
  setOpen: (o: boolean) => void;
  disabled: boolean;
  onPick: (k: "contract" | "post" | "photo") => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    ref.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => (document.removeEventListener("mousedown", close), document.removeEventListener("keydown", close));
  }, [open, setOpen]);

  const items: ["contract" | "post" | "photo", string][] = [
    ["contract", T.sampleContract[lang]],
    ["post", T.samplePost[lang]],
    ["photo", T.samplePhoto[lang]],
  ];
  return (
    <div className="k-menu" ref={ref}>
      <button className="k-tool" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}>
        {T.trySample[lang]}
        <Chevron open={open} />
      </button>
      {open && (
        <ul className="k-menu-list" role="menu">
          {items.map(([k, label]) => (
            <li key={k} role="none">
              <button role="menuitem" onClick={() => onPick(k)}>
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 10.5V2.5M4.5 6 8 2.5 11.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 10.5v3h11v-3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }}>
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
