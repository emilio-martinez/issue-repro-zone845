/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OverlayRef, GlobalPositionStrategy} from '@angular/material';
import {AnimationEvent} from '@angular/animations';
import {DialogPosition} from './dialog-config';
import {Observable} from 'rxjs/Observable';
import {Subject} from 'rxjs/Subject';
import {NgExampleDialogContainer} from './dialog-container';
import 'rxjs/add/operator/filter';

/**
 * Reference to a dialog opened via the NgExampleDialog service.
 */
export class NgExampleDialogRef<T> {
  /** The instance of component opened into the dialog. */
  componentInstance: T;

  /** Whether the user is allowed to close the dialog. */
  disableClose = this._containerInstance._config.disableClose;

  /** Subject for notifying the user that the dialog has finished closing. */
  private _afterClosed: Subject<any> = new Subject();

  /** Result to be passed to afterClosed. */
  private _result: any;

  constructor(private _overlayRef: OverlayRef, private _containerInstance: NgExampleDialogContainer) {
    _containerInstance._onAnimationStateChange.filter(
      (event: AnimationEvent) => event.toState === 'exit')
      .subscribe(() => this._overlayRef.dispose(), undefined, () => {
        this._afterClosed.next(this._result);
        this._afterClosed.complete();
        this.componentInstance = null!;
      })
  }

  /**
   * Close the dialog.
   * @param dialogResult Optional result to return to the dialog opener.
   */
  close(dialogResult?: any): void {
    this._result = dialogResult;
    this._containerInstance._state = 'exit';
    this._overlayRef.detachBackdrop(); // Transition the backdrop in parallel with the dialog.
  }

  /**
   * Gets an observable that is notified when the dialog is finished closing.
   */
  afterClosed(): Observable<any> {
    return this._afterClosed.asObservable();
  }

  /**
   * Updates the dialog's position.
   * @param position New dialog position.
   */
  updatePosition(position?: DialogPosition): this {
    let strategy = this._getPositionStrategy();

    if (position && (position.left || position.right)) {
      position.left ? strategy.left(position.left) : strategy.right(position.right);
    } else {
      strategy.centerHorizontally();
    }

    if (position && (position.top || position.bottom)) {
      position.top ? strategy.top(position.top) : strategy.bottom(position.bottom);
    } else {
      strategy.centerVertically();
    }

    this._overlayRef.updatePosition();

    return this;
  }

  /**
   * Updates the dialog's width and height.
   * @param width New width of the dialog.
   * @param height New height of the dialog.
   */
  updateSize(width = 'auto', height = 'auto'): this {
    this._getPositionStrategy().width(width).height(height);
    this._overlayRef.updatePosition();
    return this;
  }

  /** Fetches the position strategy object from the overlay ref. */
  private _getPositionStrategy(): GlobalPositionStrategy {
    return this._overlayRef.getState().positionStrategy as GlobalPositionStrategy;
  }
}
