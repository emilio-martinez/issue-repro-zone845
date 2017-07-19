import { inject, async, fakeAsync, flushMicrotasks, ComponentFixture, TestBed } from '@angular/core/testing';
import { NgModule, Component, Directive, ViewChild, ViewContainerRef, Injector } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Location } from '@angular/common';
import { SpyLocation } from '@angular/common/testing';
import { NgExampleDialogModule } from './index';
import { NgExampleDialog } from './dialog';
import { OverlayContainer } from '@angular/material';
import { NgExampleDialogRef } from './dialog-ref';

describe('NgExampleDialog', () => {
  let dialog: NgExampleDialog;
  let overlayContainerElement: HTMLElement;

  let testViewContainerRef: ViewContainerRef;
  let viewContainerFixture: ComponentFixture<ComponentWithChildViewContainer>;
  let mockLocation: SpyLocation;

  beforeEach(
    async(() => {
      TestBed.configureTestingModule({
        imports: [NgExampleDialogModule, DialogTestModule],
        providers: [
          {
            provide: OverlayContainer,
            useFactory: () => {
              overlayContainerElement = document.createElement('div');
              return { getContainerElement: () => overlayContainerElement };
            }
          },
          { provide: Location, useClass: SpyLocation }
        ]
      });

      TestBed.compileComponents();
    })
  );

  beforeEach(
    inject([NgExampleDialog, Location], (d: NgExampleDialog, l: Location) => {
      dialog = d;
      mockLocation = l as SpyLocation;
    })
  );

  beforeEach(() => {
    viewContainerFixture = TestBed.createComponent(ComponentWithChildViewContainer);

    viewContainerFixture.detectChanges();
    testViewContainerRef = viewContainerFixture.componentInstance.childViewContainer;
  });

  describe('focus management', () => {
    // When testing focus, all of the elements must be in the DOM.
    beforeEach(() => document.body.appendChild(overlayContainerElement));
    afterEach(() => document.body.removeChild(overlayContainerElement));

    it(
      'should focus the first tabbable element of the dialog on open',
      fakeAsync(() => {
        dialog.open(PizzaMsg, {
          viewContainerRef: testViewContainerRef
        });

        viewContainerFixture.detectChanges();
        flushMicrotasks();

        expect(document.activeElement.tagName).toBe(
          'INPUT',
          'Expected first tabbable element (input) in the dialog to be focused.'
        );
      })
    );
  });
});

@Directive({ selector: 'dir-with-view-container' })
class DirectiveWithViewContainer {
  constructor(public viewContainerRef: ViewContainerRef) {}
}

@Component({
  selector: 'arbitrary-component',
  template: `<dir-with-view-container></dir-with-view-container>`
})
class ComponentWithChildViewContainer {
  @ViewChild(DirectiveWithViewContainer) childWithViewContainer: DirectiveWithViewContainer;

  get childViewContainer() {
    return this.childWithViewContainer.viewContainerRef;
  }
}

/** Simple component for testing ComponentPortal. */
@Component({ template: '<p>Pizza</p> <input> <button>Close</button>' })
class PizzaMsg {
  constructor(public dialogRef: NgExampleDialogRef<PizzaMsg>, public dialogInjector: Injector) {}
}

const TEST_DIRECTIVES = [ComponentWithChildViewContainer, PizzaMsg, DirectiveWithViewContainer];

@NgModule({
  imports: [NgExampleDialogModule, NoopAnimationsModule],
  exports: TEST_DIRECTIVES,
  declarations: TEST_DIRECTIVES,
  entryComponents: [ComponentWithChildViewContainer, PizzaMsg]
})
class DialogTestModule {}
