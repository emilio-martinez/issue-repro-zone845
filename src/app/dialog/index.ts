import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule, PortalModule, A11yModule } from '@angular/material';
import { NgExampleDialog, NG_EXAMPLE_DIALOG_SCROLL_STRATEGY_PROVIDER } from './dialog';
import { NgExampleDialogContainer } from './dialog-container';

@NgModule({
  imports: [CommonModule, OverlayModule, PortalModule, A11yModule],
  exports: [NgExampleDialogContainer],
  declarations: [NgExampleDialogContainer],
  providers: [NgExampleDialog, NG_EXAMPLE_DIALOG_SCROLL_STRATEGY_PROVIDER],
  entryComponents: [NgExampleDialogContainer]
})
export class NgExampleDialogModule {}

export * from './dialog';
export * from './dialog-container';
export * from './dialog-config';
export * from './dialog-ref';
