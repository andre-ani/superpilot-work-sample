import { IconArrowUpRight, IconCheck, IconLoader2, IconPalette, IconPackage, IconBulb, IconPhoto } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export function WorkspaceChecklist({ brandName, brandReady, brandWorking, productCount, selectedCount, ideasReady, ideasWorking, hasArtwork, artworkStarted, step, onStep }: {
  brandName?: string; brandReady: boolean; brandWorking: boolean; productCount: number; selectedCount: number; ideasReady: boolean; ideasWorking: boolean; hasArtwork: boolean; artworkStarted: boolean; step: string; onStep: (step: string) => void
}) {
  const rows = [
    { id: 'brand', label: 'Review your brand', detail: brandWorking ? 'Understanding your brand' : brandReady ? 'Brand context is available' : 'Review the available brand details', Icon: IconPalette, done: brandReady, working: brandWorking, disabled: false },
    { id: 'products', label: 'Choose products', detail: selectedCount ? `${selectedCount} selected` : `${productCount} available · optional`, Icon: IconPackage, done: selectedCount > 0, working: false, disabled: !productCount },
    { id: 'create', label: 'Choose an ad idea', detail: ideasWorking ? 'Developing ideas' : ideasReady ? 'Your ideas are ready' : 'Find a direction for your ad', Icon: IconBulb, done: ideasReady, working: ideasWorking, disabled: !brandReady },
    { id: 'studio', label: 'Create your image', detail: hasArtwork ? 'Your artwork is saved' : artworkStarted ? 'Creating your artwork' : 'Generate from your chosen context', Icon: IconPhoto, done: hasArtwork, working: artworkStarted && !hasArtwork, disabled: !artworkStarted },
  ]
  return <div className="px-1 py-3" aria-label="Create your ad checklist"><p className="mb-4 px-2 text-base font-medium leading-6">Create an ad{brandName ? ` for ${brandName}` : ''}</p><ol className="space-y-1">{rows.map(({id,label,detail,Icon,done,working,disabled}) => <li key={id}><Button type="button" variant="ghost" className={`h-auto w-full justify-start gap-3 rounded-xl px-2 py-3 text-left whitespace-normal ${step === id ? 'bg-muted/50' : ''}`} disabled={disabled} onClick={()=>onStep(id)}><span className={`grid size-9 shrink-0 place-items-center rounded-full border ${done ? 'border-primary/30 text-primary' : 'border-border text-foreground'}`}>{working ? <IconLoader2 className="size-4 animate-spin motion-reduce:animate-none"/> : done ? <IconCheck className="size-4"/> : <Icon className="size-4"/>}</span><span className="min-w-0 flex-1"><span className="block text-[15px] font-medium leading-6">{label}</span><span className="block text-xs font-normal leading-5 text-muted-foreground">{detail}</span></span>{!disabled ? <IconArrowUpRight className="size-4 shrink-0 text-muted-foreground"/> : null}</Button></li>)}</ol></div>
}
