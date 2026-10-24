// Entry point of "Customize layout" (page property label menu, View settings › More settings › Customize page layout,
// row page ••• › Customize layout). Needs edit access to the database structure; a locked database refuses
// ("Unlock this table to adjust its layout.").
import { useUI } from '../../../lib/store/ui.ts';
import { collectionAccess } from '../access.ts';
import { tx } from '../../shell/i18n.ts';

export function openLayoutBuilder(collectionId: string) {
  const access = collectionAccess(collectionId);
  if (access.locked) {
    useUI.getState().toast(tx('Unlock this table to adjust its layout.'));
    return;
  }
  if (!access.canEditStructure) return;
  void import('./LayoutBuilder.tsx').then((m) => m.openLayoutBuilderOverlay(collectionId));
}
