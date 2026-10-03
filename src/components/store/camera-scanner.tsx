'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface CameraScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}

/**
 * Camera-based barcode scanner.
 * Uses the device's rear camera and ZXing to decode barcodes in real-time.
 * On successful decode, calls onDetected(code) and closes the dialog.
 */
export function CameraScanner({
  open,
  onOpenChange,
  onDetected,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'starting' | 'scanning' | 'success' | 'error'
  >('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [lastCode, setLastCode] = useState<string | null>(null)
  const [lastAt, setLastAt] = useState<number>(0)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const startScanner = async () => {
      setStatus('starting')
      setErrorMsg('')

      try {
        // dynamic import keeps ZXing out of the initial bundle
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const { DecodeHintType, BarcodeFormat } = await import('@zxing/library')

        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.CODABAR,
          BarcodeFormat.ITF,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        const reader = new BrowserMultiFormatReader(hints)

        // pick the back camera if we can identify it
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        let deviceId: string | undefined = undefined
        if (devices.length > 1) {
          // try back camera (often labeled "back" or "rear")
          const back = devices.find((d) =>
            /back|rear|environment/i.test(d.label)
          )
          deviceId = back?.deviceId ?? devices[devices.length - 1].deviceId
        }

        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const text = result.getText()
              // debounce: same code within 2.5s = ignore (avoid double-fire)
              const now = Date.now()
              if (text === lastCodeRef.current && now - lastAtRef.current < 2500) {
                return
              }
              lastCodeRef.current = text
              lastAtRef.current = now
              setLastCode(text)
              setLastAt(now)
              setStatus('success')
              onDetected(text)
              // give a brief visual confirmation then close
              setTimeout(() => {
                if (!cancelled) onOpenChange(false)
              }, 600)
            }
          }
        )
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        setStatus('scanning')
      } catch (e: any) {
        console.error('[CameraScanner] start error', e)
        if (e?.name === 'NotAllowedError') {
          setErrorMsg(
            'Camera permission denied. Please allow camera access in your browser settings and try again.'
          )
        } else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') {
          setErrorMsg(
            'No camera detected on this device. Use a USB barcode scanner or type the SKU manually.'
          )
        } else {
          setErrorMsg(e?.message || 'Failed to start the camera.')
        }
        setStatus('error')
      }
    }

    startScanner()

    return () => {
      cancelled = true
      try {
        controlsRef.current?.stop()
      } catch {}
      controlsRef.current = null
    }
  }, [open])

  // keep mutable refs so the ZXing callback always sees the latest values
  const lastCodeRef = useRef<string | null>(null)
  const lastAtRef = useRef<number>(0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan with Camera
          </DialogTitle>
          <DialogDescription>
            Point the camera at the product's barcode. Decoding happens
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* video preview with overlay */}
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* scanning frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[80%] h-[40%]">
                <div className="absolute inset-0 border-2 border-white/70 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-400 animate-pulse" />
              </div>
            </div>
            {/* status chip */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
              <Badge
                variant={
                  status === 'scanning'
                    ? 'secondary'
                    : status === 'success'
                    ? 'default'
                    : status === 'error'
                    ? 'destructive'
                    : 'outline'
                }
                className="backdrop-blur bg-black/60 text-white border-white/20"
              >
                {status === 'starting' && 'Starting camera...'}
                {status === 'scanning' && 'Scanning...'}
                {status === 'success' && 'Code detected!'}
                {status === 'error' && 'Error'}
                {status === 'idle' && 'Idle'}
              </Badge>
              {status === 'starting' && (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              )}
              {status === 'scanning' && (
                <Camera className="h-4 w-4 text-white" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
            </div>
          </div>

          {/* error state */}
          {status === 'error' && (
            <div className="flex items-start gap-2 rounded-md bg-rose-50 border border-rose-200 p-3 text-rose-800 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* last detected code */}
          {lastCode && (
            <div className="flex items-center justify-between rounded-md bg-emerald-50 border border-emerald-200 p-3">
              <div>
                <p className="text-xs text-emerald-700 uppercase tracking-wide">
                  Detected
                </p>
                <p className="font-mono text-emerald-900 font-semibold">
                  {lastCode}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          )}

          {/* tips */}
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
            <li>Use the back (rear) camera, not the selfie camera.</li>
            <li>Hold the device ~15–20 cm from the barcode.</li>
            <li>Good lighting helps. Avoid glare on the label.</li>
            <li>Supports EAN, UPC, Code 128, Code 39, QR, DataMatrix.</li>
          </ul>

          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
