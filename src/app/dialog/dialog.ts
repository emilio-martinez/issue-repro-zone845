/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Injector,
  ComponentRef,
  Injectable,
  Optional,
  SkipSelf,
  TemplateRef,
  Inject,
  InjectionToken
} from '@angular/core';
import { Location } from '@angular/common';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Overlay, OverlayRef, ComponentType, OverlayState, ScrollStrategy } from '@angular/material';
import { ComponentPortal, TemplatePortal } from '@angular/material';
import { NgExampleDialogConfig } from './dialog-config';
import { NgExampleDialogRef } from './dialog-ref';
import { NgExampleDialogContainer } from './dialog-container';

export const ESCAPE = 27;

export function extendObject(dest: any, ...sources: any[]): any {
  if (dest == null) {
    throw TypeError('Cannot convert undefined or null to object');
  }

  for (let source of sources) {
    if (source != null) {
      for (let key in source) {
        if (source.hasOwnProperty(key)) {
          dest[key] = source[key];
        }
      }
    }
  }

  return dest;
}

export class PortalInjector implements Injector {
  constructor(private _parentInjector: Injector, private _customTokens: WeakMap<any, any>) {}

  get(token: any, notFoundValue?: any): any {
    const value = this._customTokens.get(token);

    if (typeof value !== 'undefined') {
      return value;
    }

    return this._parentInjector.get<any>(token, notFoundValue);
  }
}

/** Injection token that determines the scroll handling while the dialog is open. */
export const NG_EXAMPLE_DIALOG_SCROLL_STRATEGY = new InjectionToken<() => ScrollStrategy>('md-dialog-scroll-strategy');

/** @docs-private */
export function NG_EXAMPLE_DIALOG_SCROLL_STRATEGY_PROVIDER_FACTORY(overlay: Overlay) {
  return () => overlay.scrollStrategies.block();
}

/** @docs-private */
export const NG_EXAMPLE_DIALOG_SCROLL_STRATEGY_PROVIDER = {
  provide: NG_EXAMPLE_DIALOG_SCROLL_STRATEGY,
  deps: [Overlay],
  useFactory: NG_EXAMPLE_DIALOG_SCROLL_STRATEGY_PROVIDER_FACTORY
};

/**
 * Service to open Material Design modal dialogs.
 */
@Injectable()
export class NgExampleDialog {
  private _openDialogsAtThisLevel: NgExampleDialogRef<any>[] = [];
  private _afterAllClosedAtThisLevel = new Subject<void>();
  private _afterOpenAtThisLevel = new Subject<NgExampleDialogRef<any>>();
  private _boundKeydown = this._handleKeydown.bind(this);

  /** Keeps track of the currently-open dialogs. */
  get _openDialogs(): NgExampleDialogRef<any>[] {
    return this._parentDialog ? this._parentDialog._openDialogs : this._openDialogsAtThisLevel;
  }

  /** Subject for notifying the user that a dialog has opened. */
  get _afterOpen(): Subject<NgExampleDialogRef<any>> {
    return this._parentDialog ? this._parentDialog._afterOpen : this._afterOpenAtThisLevel;
  }

  /** Subject for notifying the user that all open dialogs have finished closing. */
  get _afterAllClosed(): Subject<void> {
    return this._parentDialog ? this._parentDialog._afterAllClosed : this._afterAllClosedAtThisLevel;
  }

  /** Gets an observable that is notified when a dialog has been opened. */
  afterOpen: Observable<NgExampleDialogRef<any>> = this._afterOpen.asObservable();

  /** Gets an observable that is notified when all open dialog have finished closing. */
  afterAllClosed: Observable<void> = this._afterAllClosed.asObservable();

  constructor(
    private _overlay: Overlay,
    private _injector: Injector,
    @Inject(NG_EXAMPLE_DIALOG_SCROLL_STRATEGY) private _scrollStrategy,
    @Optional() _location: Location,
    @Optional() @SkipSelf() private _parentDialog: NgExampleDialog
  ) {
    // Close all of the dialogs when the user goes forwards/backwards in history or when the
    // location hash changes. Note that this usually doesn't include clicking on links (unless
    // the user is using the `HashLocationStrategy`).
    if (!_parentDialog && _location) {
      _location.subscribe(() => this.closeAll());
    }
  }

  /**
   * Opens a modal dialog containing the given component.
   * @param componentOrTemplateRef Type of the component to load into the dialog,
   *     or a TemplateRef to instantiate as the dialog content.
   * @param config Extra configuration options.
   * @returns Reference to the newly-opened dialog.
   */
  open<T>(
    componentOrTemplateRef: ComponentType<T> | TemplateRef<T>,
    config?: NgExampleDialogConfig
  ): NgExampleDialogRef<T> {
    config = _applyConfigDefaults(config);

    let overlayRef = this._createOverlay(config);
    let dialogContainer = this._attachDialogContainer(overlayRef, config);
    let dialogRef = this._attachDialogContent(componentOrTemplateRef, dialogContainer, overlayRef, config);

    if (!this._openDialogs.length) {
      document.addEventListener('keydown', this._boundKeydown);
    }

    this._openDialogs.push(dialogRef);
    dialogRef.afterClosed().subscribe(() => this._removeOpenDialog(dialogRef));
    this._afterOpen.next(dialogRef);

    return dialogRef;
  }

  /**
   * Closes all of the currently-open dialogs.
   */
  closeAll(): void {
    let i = this._openDialogs.length;

    while (i--) {
      // The `_openDialogs` property isn't updated after close until the rxjs subscription
      // runs on the next microtask, in addition to modifying the array as we're going
      // through it. We loop through all of them and call close without assuming that
      // they'll be removed from the list instantaneously.
      this._openDialogs[i].close();
    }
  }

  /**
   * Creates the overlay into which the dialog will be loaded.
   * @param config The dialog configuration.
   * @returns A promise resolving to the OverlayRef for the created overlay.
   */
  private _createOverlay(config: NgExampleDialogConfig): OverlayRef {
    let overlayState = this._getOverlayState(config);
    return this._overlay.create(overlayState);
  }

  /**
   * Creates an overlay state from a dialog config.
   * @param dialogConfig The dialog configuration.
   * @returns The overlay configuration.
   */
  private _getOverlayState(dialogConfig: NgExampleDialogConfig): OverlayState {
    let overlayState = new OverlayState();
    overlayState.panelClass = dialogConfig.panelClass;
    overlayState.hasBackdrop = dialogConfig.hasBackdrop;
    overlayState.scrollStrategy = this._scrollStrategy();
    if (dialogConfig.backdropClass) {
      overlayState.backdropClass = dialogConfig.backdropClass;
    }
    overlayState.positionStrategy = this._overlay.position().global();

    return overlayState;
  }

  /**
   * Attaches an NgExampleDialogContainer to a dialog's already-created overlay.
   * @param overlay Reference to the dialog's underlying overlay.
   * @param config The dialog configuration.
   * @returns A promise resolving to a ComponentRef for the attached container.
   */
  private _attachDialogContainer(overlay: OverlayRef, config: NgExampleDialogConfig): NgExampleDialogContainer {
    let containerPortal = new ComponentPortal(NgExampleDialogContainer, config.viewContainerRef);
    let containerRef: ComponentRef<NgExampleDialogContainer> = overlay.attach(containerPortal);
    containerRef.instance._config = config;

    return containerRef.instance;
  }

  /**
   * Attaches the user-provided component to the already-created NgExampleDialogContainer.
   * @param componentOrTemplateRef The type of component being loaded into the dialog,
   *     or a TemplateRef to instantiate as the content.
   * @param dialogContainer Reference to the wrapping NgExampleDialogContainer.
   * @param overlayRef Reference to the overlay in which the dialog resides.
   * @param config The dialog configuration.
   * @returns A promise resolving to the NgExampleDialogRef that should be returned to the user.
   */
  private _attachDialogContent<T>(
    componentOrTemplateRef: ComponentType<T> | TemplateRef<T>,
    dialogContainer: NgExampleDialogContainer,
    overlayRef: OverlayRef,
    config: NgExampleDialogConfig
  ): NgExampleDialogRef<T> {
    // Create a reference to the dialog we're creating in order to give the user a handle
    // to modify and close it.
    let dialogRef = new NgExampleDialogRef<T>(overlayRef, dialogContainer);

    // When the dialog backdrop is clicked, we want to close it.
    if (config.hasBackdrop) {
      overlayRef.backdropClick().subscribe(() => {
        if (!dialogRef.disableClose) {
          dialogRef.close();
        }
      });
    }

    if (componentOrTemplateRef instanceof TemplateRef) {
      dialogContainer.attachTemplatePortal(new TemplatePortal(componentOrTemplateRef, null!));
    } else {
      let injector = this._createInjector<T>(config, dialogRef, dialogContainer);
      let contentRef = dialogContainer.attachComponentPortal(
        new ComponentPortal(componentOrTemplateRef, undefined, injector)
      );
      dialogRef.componentInstance = contentRef.instance;
    }

    dialogRef.updateSize(config.width, config.height).updatePosition(config.position);

    return dialogRef;
  }

  /**
   * Creates a custom injector to be used inside the dialog. This allows a component loaded inside
   * of a dialog to close itself and, optionally, to return a value.
   * @param config Config object that is used to construct the dialog.
   * @param dialogRef Reference to the dialog.
   * @param container Dialog container element that wraps all of the contents.
   * @returns The custom injector that can be used inside the dialog.
   */
  private _createInjector<T>(
    config: NgExampleDialogConfig,
    dialogRef: NgExampleDialogRef<T>,
    dialogContainer: NgExampleDialogContainer
  ): PortalInjector {
    let userInjector = config && config.viewContainerRef && config.viewContainerRef.injector;
    let injectionTokens = new WeakMap();

    injectionTokens.set(NgExampleDialogRef, dialogRef);
    injectionTokens.set(NgExampleDialogContainer, dialogContainer);

    return new PortalInjector(userInjector || this._injector, injectionTokens);
  }

  /**
   * Removes a dialog from the array of open dialogs.
   * @param dialogRef Dialog to be removed.
   */
  private _removeOpenDialog(dialogRef: NgExampleDialogRef<any>) {
    let index = this._openDialogs.indexOf(dialogRef);

    if (index > -1) {
      this._openDialogs.splice(index, 1);

      // no open dialogs are left, call next on afterAllClosed Subject
      if (!this._openDialogs.length) {
        this._afterAllClosed.next();
        document.removeEventListener('keydown', this._boundKeydown);
      }
    }
  }

  /**
   * Handles global key presses while there are open dialogs. Closes the
   * top dialog when the user presses escape.
   */
  private _handleKeydown(event: KeyboardEvent): void {
    let topDialog = this._openDialogs[this._openDialogs.length - 1];
    let canClose = topDialog ? !topDialog.disableClose : false;

    if (event.keyCode === ESCAPE && canClose) {
      topDialog.close();
    }
  }
}

/**
 * Applies default options to the dialog config.
 * @param config Config to be modified.
 * @returns The new configuration object.
 */
function _applyConfigDefaults(config?: NgExampleDialogConfig): NgExampleDialogConfig {
  return extendObject(new NgExampleDialogConfig(), config);
}
