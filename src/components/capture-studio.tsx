import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, Square, Trash2, Upload, Video, X } from "lucide-react";
import { getSession } from "@/lib/supabase";
import { newObjectId } from "@/lib/media";
import {
  ACCEPT_ATTRIBUTE,
  CAPTURED_PHOTO_TYPE,
  MAX_MEDIA_PER_POST,
  MAX_VIDEO_BYTES,
  type FeedAudience,
  mediaKind,
  publishPost,
  validateMedia,
} from "@/lib/feed/publish";

/** Recording stops on its own here: the bucket accepts 50 MB and bitrate varies by device. */
const MAX_RECORDING_MS = 30_000;

type Capture = { id: string; file: File; url: string; kind: "photo" | "video" };

type CameraState = "idle" | "starting" | "ready" | "denied" | "unsupported";

function pickRecorderType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function readableSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Studio de captura: tira foto ou grava vídeo com a câmera do celular ou do
 * notebook e publica direto no feed.
 *
 * O envio de arquivos do dispositivo continua disponível no mesmo lugar, porque
 * a câmera do sistema é melhor para vídeo longo e nem todo notebook tem câmera.
 */
export function CaptureStudio({
  open,
  onClose,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  /** Confirmado no painel de quem abriu o estúdio, já que o modal fecha sozinho. */
  onPublished?: (message: string) => void;
}) {
  const uid = getSession()?.user.id;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  /** Uma gravação interrompida pelo fechamento não deve virar mídia na lista. */
  const discardRef = useRef(false);

  const [camera, setCamera] = useState<CameraState>("idle");
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<FeedAudience>("PUBLIC");
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopCamera = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      discardRef.current = true;
      recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopStream();
    setRecording(false);
    setCamera("idle");
  }, [stopStream]);

  const addCapture = useCallback((file: File) => {
    const problem = validateMedia(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setCaptures((items) =>
      items.length >= MAX_MEDIA_PER_POST
        ? items
        : [...items, { id: newObjectId(), file, url: URL.createObjectURL(file), kind: mediaKind(file) ?? "photo" }],
    );
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCamera("unsupported");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      // getUserMedia só existe em contexto seguro; em http:// o navegador
      // recusa a mídia antes mesmo de pedirmos permissão.
      setCamera("unsupported");
      return;
    }
    setCamera("starting");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      setCamera("ready");
      setDevices(await navigator.mediaDevices.enumerateDevices().catch(() => []));
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCamera("denied");
        setError(
          "O navegador bloqueou o acesso à câmera. Libere a permissão nas configurações do site e tente de novo, ou envie um arquivo do dispositivo.",
        );
        return;
      }
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCamera("unsupported");
        setError("Nenhuma câmera foi encontrada neste dispositivo.");
        return;
      }
      setCamera("unsupported");
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir a câmera.");
    }
  }, [facing]);

  useEffect(() => {
    if (open) void startCamera();
    else stopCamera();
    return stopCamera;
  }, [open, startCamera, stopCamera]);

  /* O <video> só é montado quando a câmera está pronta, ou seja, depois de
     startCamera ter devolvido o stream. Sem este efeito o srcObject ficaria
     vazio e a prévia sairia preta. */
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [camera]);

  // Alternar a câmera reinicia a captura: o MediaRecorder fica preso ao stream.
  const flipCamera = useCallback(() => {
    setFacing((current) => (current === "user" ? "environment" : "user"));
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("A câmera ainda não está pronta.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Não foi possível gerar a foto.");
          return;
        }
        addCapture(new File([blob], `foto-${newObjectId()}.jpg`, { type: CAPTURED_PHOTO_TYPE }));
      },
      CAPTURED_PHOTO_TYPE,
      0.92,
    );
  }, [addCapture]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    const mimeType = pickRecorderType();
    if (!stream || !mimeType) {
      setError("Este navegador não sabe gravar vídeo (MediaRecorder indisponível). Envie um arquivo do dispositivo.");
      return;
    }
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        // Fechar o modal interrompe a gravação; o que sobrou não é mídia válida.
        if (discardRef.current) {
          discardRef.current = false;
          chunksRef.current = [];
          return;
        }
        const type = recorder.mimeType || mimeType;
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        setRecording(false);
        if (blob.size === 0) {
          setError("A gravação terminou sem conteúdo.");
          return;
        }
        if (blob.size > MAX_VIDEO_BYTES) {
          setError(
            `A gravação ficou grande demais (${readableSize(blob.size)}). Grave um vídeo mais curto ou envie um arquivo menor.`,
          );
          return;
        }
        addCapture(new File([blob], `gravacao-${newObjectId()}.webm`, { type }));
      };
      recorder.start();
      recorderRef.current = recorder;
      discardRef.current = false;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setError("");
      setRecording(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a gravação.");
    }
  }, [addCapture]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderRef.current = null;
  }, []);

  // Corta a gravação no limite e mostra o tempo correndo.
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const spent = Date.now() - startedAtRef.current;
      setElapsed(spent);
      if (spent >= MAX_RECORDING_MS) stopRecording();
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording, stopRecording]);

  const discard = useCallback((id: string) => {
    setCaptures((items) => {
      const target = items.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return items.filter((item) => item.id !== id);
    });
  }, []);

  // Libera as URLs dos previews ao fechar, para não segurar o blob na memória.
  useEffect(() => {
    if (open) return;
    setCaptures((items) => {
      items.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setBody("");
    setError("");
    setElapsed(0);
  }, [open]);

  const publish = useCallback(async () => {
    if (!uid) {
      setError("Entre na sua conta para publicar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await publishPost({
        authorId: uid,
        body,
        audience,
        files: captures.map((item) => item.file),
      });
      const message = result.mediaCount
        ? "Publicado no feed com a sua mídia."
        : "Publicado no feed.";
      // O modal fecha na publicação, então a confirmação vive no painel de
      // quem o abriu — mostrar aqui não apareceria nem por um frame.
      onPublished?.(message);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }, [uid, body, audience, captures, onClose, onPublished]);

  if (!open) return null;

  const seconds = Math.floor(elapsed / 1000);
  const cameraVideo = devices.filter((device) => device.kind === "videoinput").length;

  return <div className="capture-studio" role="dialog" aria-modal="true" aria-label="Criar publicação com câmera">
    <div className="capture-studio-backdrop" onClick={onClose} aria-hidden="true" />
    <section className="capture-studio-panel">
      <header className="capture-studio-header">
        <div>
          <span className="auth-kicker">Criar no app</span>
          <h2>Tire uma foto ou grave um vídeo</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
      </header>

      <div className="capture-studio-stage">
        {camera === "ready" ? (
          <>
            <video
              ref={videoRef}
              className={`capture-studio-video${facing === "user" ? " is-mirrored" : ""}`}
              muted
              playsInline
              aria-label="Prévia da câmera"
            />
            {recording && (
              <span className="capture-studio-recording">
                <i /> REC {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
              </span>
            )}
          </>
        ) : (
          <div className="capture-studio-placeholder">
            {camera === "starting" ? (
              <LoaderCircle className="spin" size={26} />
            ) : (
              <Camera size={26} />
            )}
            <p>
              {camera === "starting"
                ? "Abrindo a câmera…"
                : camera === "denied"
                  ? "Permissão de câmera negada"
                  : camera === "unsupported"
                    ? "Câmera indisponível neste navegador"
                    : "Câmera desligada"}
            </p>
            {camera !== "starting" && (
              <button type="button" className="button button-outline" onClick={() => void startCamera()}>
                Tentar de novo
              </button>
            )}
          </div>
        )}
      </div>

      {camera === "ready" && (
        <div className="capture-studio-controls">
          <button type="button" className="button button-primary" onClick={takePhoto} disabled={busy || recording}>
            <Camera size={17} /> Tirar foto
          </button>
          {recording ? (
            <button type="button" className="button button-danger" onClick={stopRecording} disabled={busy}>
              <Square size={15} /> Parar gravação
            </button>
          ) : (
            <button type="button" className="button button-outline" onClick={startRecording} disabled={busy}>
              <Video size={17} /> Gravar vídeo
            </button>
          )}
          {cameraVideo > 1 && (
            <button type="button" className="button button-outline" onClick={flipCamera} disabled={busy || recording}>
              <Camera size={16} /> {facing === "user" ? "Usar câmera de trás" : "Usar câmera frontal"}
            </button>
          )}
          <span className="capture-studio-hint">
            A gravação para sozinha em {MAX_RECORDING_MS / 1000}s e usa o microfone.
          </span>
        </div>
      )}

      <label className="button button-outline capture-studio-upload">
        <Upload size={16} /> Enviar arquivo do dispositivo
        <input
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            files.forEach(addCapture);
          }}
          hidden
        />
      </label>

      {captures.length > 0 && (
        <ul className="capture-studio-list">
          {captures.map((item) => (
            <li key={item.id}>
              {item.kind === "video" ? (
                <video src={item.url} muted playsInline />
              ) : (
                <img src={item.url} alt="Foto capturada" />
              )}
              <span>
                {item.kind === "video" ? "Vídeo" : "Foto"} · {readableSize(item.file.size)}
              </span>
              <button type="button" onClick={() => discard(item.id)} aria-label="Remover mídia">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="capture-studio-fields">
        <label>
          Legenda
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Conte algo sobre esta mídia…"
          />
        </label>
        <label>
          Quem pode ver?
          <select value={audience} onChange={(event) => setAudience(event.target.value as FeedAudience)}>
            <option value="PUBLIC">Público · qualquer pessoa logada</option>
            <option value="FOLLOWERS">Restrito · seguidores cadastrados</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="capture-studio-error" role="status">
          {error}
        </p>
      )}

      <footer className="capture-studio-footer">
        <span>
          {captures.length}/{MAX_MEDIA_PER_POST} mídias
        </span>
        <div>
          <button type="button" className="button button-outline" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => void publish()}
            disabled={busy || (!body.trim() && captures.length === 0)}
            aria-busy={busy}
          >
            {busy ? "Publicando…" : "Publicar no feed"}
          </button>
        </div>
      </footer>
      <a className="capture-studio-feed-link" href="/feed">Ver o feed</a>
    </section>
  </div>;
}