'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

// O parser OFX e a tela de revisão só entram no bundle no primeiro clique.
const ImportOfxDialog = dynamic(
  () => import('./ImportOfxDialog').then((module) => module.ImportOfxDialog),
  { ssr: false }
)

interface ImportOfxButtonProps {
  onImported?: () => void | Promise<void>
  className?: string
}

export function ImportOfxButton({ onImported, className }: ImportOfxButtonProps) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => { setMounted(true); setOpen(true) }}
      >
        <Upload className="h-4 w-4" />Importar OFX
      </Button>

      {mounted && (
        <ImportOfxDialog open={open} onOpenChange={setOpen} onImported={onImported} />
      )}
    </>
  )
}
