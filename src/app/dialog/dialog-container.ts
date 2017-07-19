/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Component,
  ComponentRef,
  ViewChild,
  ViewEncapsulation,
  ElementRef,
  EventEmitter,
  Inject,
  Optional
} from '@angular/core';
import { animate, trigger, state, style, transition, AnimationEvent } from '@angular/animations';
import { DOCUMENT } from '@angular/platform-browser';
import {
  BasePortalHost,
  ComponentPortal,
  PortalHostDirective,
  TemplatePortal,
  FocusTrapFactory,
  FocusTrap
} from '@angular/material';
import { NgExampleDialogConfig } from './dialog-config';

/**
 * Throws an exception for the case when a ComponentPortal is
 * attached to a DomPortalHost without an origin.
 * @docs-private
 */
export function throwNgExampleDialogContentAlreadyAttachedError() {
  throw Error('Attempting to attach dialog content after content is already attached');
}

/**
 * Internal component that wraps user-provided dialog content.
 * Animation is based on https://material.io/guidelines/motion/choreography.html.
 * @docs-private
 */
@Component({
  selector: 'md-dialog-container, mat-dialog-container',
  template: `<ng-template cdkPortalHost></ng-template>`,
  styles: [],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideDialog', [
      // Note: The `enter` animation doesn't transition to something like `translate3d(0, 0, 0)
      // scale(1)`, because for some reason specifying the transform explicitly, causes IE both
      // to blur the dialog content and decimate the animation performance. Leaving it as `none`
      // solves both issues.
      state('enter', style({ transform: 'none', opacity: 1 })),
      state('void', style({ transform: 'translate3d(0, 25%, 0) scale(0.9)', opacity: 0 })),
      state('exit', style({ transform: 'translate3d(0, 25%, 0)', opacity: 0 })),
      transition('* => *', animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)'))
    ])
  ],
  host: {
    class: 'mat-dialog-container',
    '[attr.role]': '_config?.role',
    '[attr.aria-labelledby]': '_ariaLabelledBy',
    '[attr.aria-describedby]': '_config?.ariaDescribedBy || null',
    '[@slideDialog]': '_state',
    '(@slideDialog.done)': '_onAnimationDone($event)'
  }
})
export class NgExampleDialogContainer extends BasePortalHost {
  /** The portal host inside of this container into which the dialog content will be loaded. */
  @ViewChild(PortalHostDirective) _portalHost: PortalHostDirective;

  /** The class that traps and manages focus within the dialog. */
  private _focusTrap: FocusTrap;

  /** Element that was focused before the dialog was opened. Save this to restore upon close. */
  private _elementFocusedBeforeDialogWasOpened: HTMLElement | null = null;

  /** Reference to the global document object. */
  private _document: Document;

  /** The dialog configuration. */
  _config: NgExampleDialogConfig;

  /** State of the dialog animation. */
  _state: 'void' | 'enter' | 'exit' = 'enter';

  /** Emits the current animation state whenever it changes. */
  _onAnimationStateChange = new EventEmitter<AnimationEvent>();

  /** ID of the element that should be considered as the dialog's label. */
  _ariaLabelledBy: string | null = null;

  constructor(
    private _elementRef: ElementRef,
    private _focusTrapFactory: FocusTrapFactory,
    @Optional() @Inject(DOCUMENT) _document: any
  ) {
    super();
    this._document = _document;
  }

  /**
   * Attach a ComponentPortal as content to this dialog container.
   * @param portal Portal to be attached as the dialog content.
   */
  attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    if (this._portalHost.hasAttached()) {
      throwNgExampleDialogContentAlreadyAttachedError();
    }

    this._savePreviouslyFocusedElement();
    return this._portalHost.attachComponentPortal(portal);
  }

  /**
   * Attach a TemplatePortal as content to this dialog container.
   * @param portal Portal to be attached as the dialog content.
   */
  attachTemplatePortal(portal: TemplatePortal): Map<string, any> {
    if (this._portalHost.hasAttached()) {
      throwNgExampleDialogContentAlreadyAttachedError();
    }

    this._savePreviouslyFocusedElement();
    return this._portalHost.attachTemplatePortal(portal);
  }

  /** Moves the focus inside the focus trap. */
  private _trapFocus() {
    if (!this._focusTrap) {
      this._focusTrap = this._focusTrapFactory.create(this._elementRef.nativeElement);
    }

    // If were to attempt to focus immediately, then the content of the dialog would not yet be
    // ready in instances where change detection has to run first. To deal with this, we simply
    // wait for the microtask queue to be empty.
    this._focusTrap.focusInitialElementWhenReady();
  }

  /** Restores focus to the element that was focused before the dialog opened. */
  private _restoreFocus() {
    const toFocus = this._elementFocusedBeforeDialogWasOpened;

    // We need the extra check, because IE can set the `activeElement` to null in some cases.
    if (toFocus && 'focus' in toFocus) {
      toFocus.focus();
    }

    if (this._focusTrap) {
      this._focusTrap.destroy();
    }
  }

  /** Saves a reference to the element that was focused before the dialog was opened. */
  private _savePreviouslyFocusedElement() {
    if (this._document) {
      this._elementFocusedBeforeDialogWasOpened = this._document.activeElement as HTMLElement;
    }
  }

  /** Callback, invoked whenever an animation on the host completes. */
  _onAnimationDone(event: AnimationEvent) {
    this._onAnimationStateChange.emit(event);

    if (event.toState === 'enter') {
      this._trapFocus();
    } else if (event.toState === 'exit') {
      this._restoreFocus();
      this._onAnimationStateChange.complete();
    }
  }
}
