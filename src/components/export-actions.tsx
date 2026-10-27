import { IconChevronDown, IconDownload, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export type ExportControls = { count: number; total: number; busy: boolean; disabled?: boolean; allDisabled?: boolean; currentDisabled?: boolean; onExport: () => void; onExportCurrent: () => void; onExportAll: () => void }
export function ExportActions({ controls, scope = 'selection' }: { controls: ExportControls; scope?: 'selection' | 'image' }) {
  const disabled = (scope === 'image' ? controls.currentDisabled ?? controls.disabled : controls.disabled) || controls.busy
  const exportAction = scope === 'image' ? controls.onExportCurrent : controls.onExport
  return <ButtonGroup aria-label="Export artwork"><Button type="button" variant="composer-next" size="composer-next" onClick={exportAction} disabled={disabled}>{controls.busy ? <IconLoader2 className="size-3.5 animate-spin"/> : <IconDownload className="size-3.5"/>}{controls.busy ? 'Exporting…' : scope === 'image' ? 'Export image' : controls.count ? `Export selected (${controls.count})` : 'Export all'}</Button><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="composer-next" size="composer-next" className="border-l border-white/25 px-2 has-[>svg]:px-2" aria-label="Export options" disabled={disabled}><IconChevronDown className="size-3.5"/></Button></DropdownMenuTrigger><DropdownMenuContent data-chat-menu side="top" align="end">{scope === 'image' ? <DropdownMenuItem onSelect={controls.onExportCurrent}><IconDownload/>Export this image</DropdownMenuItem> : null}<DropdownMenuItem onSelect={controls.onExport} disabled={!controls.count || controls.disabled}><IconDownload/>Export selected ({controls.count})</DropdownMenuItem><DropdownMenuItem onSelect={controls.onExportAll} disabled={!controls.total || (controls.allDisabled ?? controls.disabled)}><IconDownload/>Export all{controls.total ? ` (${controls.total})` : ''}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></ButtonGroup>
}
