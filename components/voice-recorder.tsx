'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api-client'
import { isManagedUploadUrl } from '@/lib/upload-url'

interface VoiceRecorderProps {
  onRecorded: (url: string | null) => void
  preview?: string | null
}

const MAX_RECORD_SECONDS = 120
const AUDIO_BITRATE = 28000

function normalizeAudioMime(type: string) {
  const base = type.split(';')[0].trim().toLowerCase()
  if (base.startsWith('audio/')) return base
  return 'audio/webm'
}

function audioExtension(mime: string) {
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('mpeg')) return 'mp3'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VoiceRecorder({ onRecorded, preview }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }, [localPreview])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : ''

      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: AUDIO_BITRATE,
          })
        : new MediaRecorder(stream, { audioBitsPerSecond: AUDIO_BITRATE })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        const rawType = recorder.mimeType || 'audio/webm'
        const mimeType = normalizeAudioMime(rawType)
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size === 0) return

        const localUrl = URL.createObjectURL(blob)
        setLocalPreview(localUrl)

        setUploading(true)
        try {
          const ext = audioExtension(mimeType)
          const file = new File([blob], `voice-${Date.now()}.${ext}`, {
            type: mimeType,
          })
          const { audio_url } = await api.uploadAudio(file)
          URL.revokeObjectURL(localUrl)
          setLocalPreview(null)
          onRecorded(audio_url)
        } catch {
          alert('Gagal simpan suara — akan disimpan saat online')
          URL.revokeObjectURL(localUrl)
          setLocalPreview(null)
          onRecorded(null)
        } finally {
          setUploading(false)
          setDuration(0)
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start(200)
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const next = d + 1
          if (next >= MAX_RECORD_SECONDS) {
            stopRecording()
          }
          return next
        })
      }, 1000)
    } catch {
      alert('Tidak bisa akses mikrofon')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const clearRecording = () => {
    if (localPreview) URL.revokeObjectURL(localPreview)
    setLocalPreview(null)
    if (preview && isManagedUploadUrl(preview)) {
      void api.deleteUpload(preview).catch(() => {})
    }
    onRecorded(null)
  }

  const audioSrc = localPreview || preview

  if (audioSrc) {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 p-3">
        <audio src={audioSrc} controls className="w-full" />
        <button
          type="button"
          onClick={clearRecording}
          disabled={uploading}
          className="mt-2 w-full rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {uploading ? 'Mengupload...' : '🗑️ Hapus rekaman'}
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      disabled={uploading}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium transition-colors ${
        recording
          ? 'animate-pulse border-red-400 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
          : 'border-border bg-secondary/50 text-foreground'
      }`}
    >
      {recording ? (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          Stop ({formatDuration(duration)})
        </>
      ) : (
        <>🎤 Rekam suara</>
      )}
    </button>
  )
}
