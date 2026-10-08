import { useEffect, useRef, useState } from 'react';

import { Alert, Button, Dialog, DialogActions, DialogHeader } from '../../../shared/components/ui';
import { interpretOrderPhoto, orderScanDemo } from '../lib/scanApi';
import type { ScanDraft } from '../schemas/scanDraft';
import styles from './OrderScanModal.module.css';

type Stage = 'choose' | 'camera' | 'photo' | 'loading' | 'complete';
type Props = { onClose: () => void; onReview: (draft: ScanDraft) => void };

export function OrderScanModal({ onClose, onReview }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const progressTimer = useRef<number | null>(null);
  const mounted = useRef(true);
  const [stage, setStage] = useState<Stage>('choose');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!photo) {
      setPhotoUrl('');
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (stage !== 'camera') return;
    let cancelled = false;
    async function startCamera() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
      } catch {
        if (!cancelled) {
          setStage('choose');
          setError('Não foi possível abrir a câmara. Escolha uma foto do aparelho.');
        }
      }
    }
    void startCamera();
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
    };
  }, [stage]);

  function selectPhoto(file: File | null) {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Escolha uma fotografia JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 5_000_000) {
      setError('A fotografia deve ter até 5 MB.');
      return;
    }
    setPhoto(file);
    setDraft(null);
    setError('');
    setStage('photo');
  }

  async function capturePhoto() {
    const currentVideo = video.current;
    if (!currentVideo?.videoWidth || !currentVideo.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = currentVideo.videoWidth;
    canvas.height = currentVideo.videoHeight;
    canvas.getContext('2d')?.drawImage(currentVideo, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob) {
      setError('Não foi possível tirar a fotografia. Tente novamente.');
      return;
    }
    selectPhoto(new File([blob], 'encomenda.jpg', { type: 'image/jpeg' }));
  }

  async function readPhoto() {
    if (!photo || stage !== 'photo') return;
    setError('');
    setProgress(5);
    setStage('loading');
    progressTimer.current = window.setInterval(() => {
      setProgress((current) => Math.min(90, current + 5));
    }, 300);
    try {
      const result = await interpretOrderPhoto(photo);
      if (orderScanDemo) await new Promise((resolve) => window.setTimeout(resolve, 1_800));
      if (!mounted.current) return;
      setDraft(result);
      setProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      if (mounted.current) setStage('complete');
    } catch (cause) {
      if (!mounted.current) return;
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler a fotografia.');
      setStage('photo');
    } finally {
      if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }

  return (
    <Dialog className={styles.dialog} titleId="order-scan-title" onClose={onClose}>
      <DialogHeader title="Digitalizar encomenda" titleId="order-scan-title" onClose={onClose} />
      <input
        ref={fileInput}
        className={styles.hiddenFile}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => selectPhoto(event.target.files?.[0] ?? null)}
      />

      {stage === 'choose' && (
        <div className={styles.choice}>
          {error && <Alert tone="error">{error}</Alert>}
          <p>Como deseja adicionar a fotografia?</p>
          <Button
            variant="primary"
            onClick={() => {
              setError('');
              setStage('camera');
            }}
          >
            Abrir câmara
          </Button>
          <Button onClick={() => fileInput.current?.click()}>Escolher foto</Button>
        </div>
      )}

      {stage === 'camera' && (
        <div className={styles.photoStage}>
          {error && <Alert tone="error">{error}</Alert>}
          <video ref={video} autoPlay playsInline muted aria-label="Pré-visualização da câmara" />
          <div className={styles.actions}>
            <Button onClick={() => setStage('choose')}>Voltar</Button>
            <Button variant="primary" onClick={() => void capturePhoto()}>
              Tirar foto
            </Button>
          </div>
        </div>
      )}

      {stage === 'photo' && (
        <>
          <div className={styles.photoStage}>
            {error && <Alert tone="error">{error}</Alert>}
            {orderScanDemo && (
              <p className={styles.demoNote}>
                Prévia de demonstração: esta fotografia ainda não é lida por IA.
              </p>
            )}
            {photoUrl && (
              <img
                className={styles.photoPreview}
                src={photoUrl}
                alt="Fotografia selecionada para leitura"
              />
            )}
            <Button
              className={styles.changePhoto}
              variant="ghost"
              onClick={() => fileInput.current?.click()}
            >
              Escolher outra foto
            </Button>
          </div>
          <DialogActions>
            <Button
              onClick={() => {
                setPhoto(null);
                setStage('choose');
              }}
            >
              Voltar
            </Button>
            <Button variant="primary" onClick={() => void readPhoto()}>
              {orderScanDemo ? 'Ver simulação' : 'Ler fotografia'}
            </Button>
          </DialogActions>
        </>
      )}

      {stage === 'loading' && (
        <div className={styles.progressStage} role="status" aria-live="polite">
          <strong>{orderScanDemo ? 'A preparar o exemplo' : 'A ler a fotografia'}</strong>
          <span className={styles.percentage}>{progress}%</span>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Progresso estimado da leitura"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>Progresso estimado. A conclusão será confirmada ao terminar a leitura.</small>
        </div>
      )}

      {stage === 'complete' && (
        <div className={styles.completeStage} role="status" aria-live="polite">
          <span className={styles.completeIcon} aria-hidden="true">
            ✓
          </span>
          <strong>{orderScanDemo ? 'Simulação concluída' : 'Leitura concluída'}</strong>
          <p>
            {orderScanDemo
              ? 'Os dados de exemplo estão prontos.'
              : 'Os dados estão prontos para revisão.'}
          </p>
          <Button variant="primary" disabled={!draft} onClick={() => draft && onReview(draft)}>
            Revisar encomenda
          </Button>
        </div>
      )}
    </Dialog>
  );
}
