# Zone845

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.2.1.

## Issue Background

The original comment at https://github.com/angular/zone.js/issues/845

-----

I'm experiencing a regression issue when upgrading from zone@0.8.12 to zone@0.8.14 while using the Angular 4.3.0 unit test utilities. I now get `Error: 1 timer(s) still in the queue.`—more details below.

I'm filling the issue on this repo since I believe it's related to Zone's Scheduler. Just to double check, I've tested making the zone upgrade the only change in before/after, so I can assure there's no other dependency change that may cause this in my situation.

Of course, I'm not really utilizing Zone directly, but in essence, the situation where this is occurring for me is as follows:

```ts
it('should work', fakeAsync(() => {
  // --------------------------------------------- //
  // code invoking a Dialog component to open here //
  // --------------------------------------------- //

  viewContainerFixture.detectChanges();
  flushMicrotasks(); // Uh oh. The test throws here!

  // Never reaches expectation
  expect(expression).toBe('...');
}));
```

However, calling `tick` before `flushMicrotasks` clears the error, not that it's really a fix since it didn't seem to be an issue before. Below my stack trace in case it's useful.

```
Error: 1 timer(s) still in the queue.
  at Object.<anonymous> (webpack:///node_modules/@angular/core/@angular/core/testing.js:350:22 <- src/test.ts:11703:914)
  at ZoneDelegate.invoke (webpack:///node_modules/zone.js/dist/zone.js:391:25 <- src/test.ts:24777:1154)
  at ProxyZoneSpec.onInvoke (webpack:///node_modules/zone.js/dist/proxy.js:79:38 <- src/test.ts:25211:2160)
  at ZoneDelegate.invoke (webpack:///node_modules/zone.js/dist/zone.js:390:31 <- src/test.ts:24777:1050)
  at Zone.run (webpack:///node_modules/zone.js/dist/zone.js:141:42 <- src/test.ts:24761:2925)
  at Object.<anonymous> (webpack:///node_modules/zone.js/dist/jasmine-patch.js:104:33 <- src/test.ts:25260:131)
  at webpack:///node_modules/@angular/core/@angular/core/testing.js:91:16 <- src/test.ts:11633:46
  at ZoneDelegate.invoke (webpack:///node_modules/zone.js/dist/zone.js:391:25 <- src/test.ts:24777:1154)
  at AsyncTestZoneSpec.onInvoke (webpack:///node_modules/zone.js/dist/async-test.js:49:38 <- src/test.ts:25115:156)
  at ProxyZoneSpec.onInvoke (webpack:///node_modules/zone.js/dist/proxy.js:76:38 <- src/test.ts:25211:2040)
  at ZoneDelegate.invoke (webpack:///node_modules/zone.js/dist/zone.js:390:31 <- src/test.ts:24777:1050)
  at Zone.run (webpack:///node_modules/zone.js/dist/zone.js:141:42 <- src/test.ts:24761:2925)
  at AsyncTestZoneSpec._finishCallback (webpack:///node_modules/@angular/core/@angular/core/testing.js:86:24 <- src/test.ts:11632:13)
  at webpack:///node_modules/zone.js/dist/async-test.js:38:30 <- src/test.ts:25112:139
  at ZoneDelegate.invokeTask (webpack:///node_modules/zone.js/dist/zone.js:424:30 <- src/test.ts:24777:2120)
  at Zone.runTask (webpack:///node_modules/zone.js/dist/zone.js:191:46 <- src/test.ts:24766:417)
  at ZoneTask.invokeTask (webpack:///node_modules/zone.js/dist/zone.js:498:33 <- src/test.ts:24779:1209)
  at ZoneTask.invoke (webpack:///node_modules/zone.js/dist/zone.js:487:47 <- src/test.ts:24779:1036)
  at timer (webpack:///node_modules/zone.js/dist/zone.js:1823:28 <- src/test.ts:24944:248)
```

-----

## Issue reproduction

For the purposes of reproducing this issue, see the Dialog Component inside the `src/` directory which is a slightly modified version of the Dialog provided by `@angular/material`. While this isn't the same code on the project where I initially noticed the issue, that code was developed with `@angular/material`'s code as reference material; they both suffer the same problem. Additionally, the codebase where the issue was originally perceived was not started on top of Angular CLI, but similar testing utilities were used.

This code base will throw the following stack trace, slightly different from the above:

```
Error: 1 timer(s) still in the queue.
  at Object.<anonymous> (http://localhost:9876/_karma_webpack_/vendor.bundle.js:63267:23)
  at ZoneDelegate.webpackJsonp.../../../../zone.js/dist/zone.js.ZoneDelegate.invoke (http://localhost:9876/_karma_webpack_/polyfills.bundle.js:2801:26)
  at ProxyZoneSpec.webpackJsonp.../../../../zone.js/dist/proxy.js.ProxyZoneSpec.onInvoke (http://localhost:9876/_karma_webpack_/vendor.bundle.js:5772:39)
  at ZoneDelegate.webpackJsonp.../../../../zone.js/dist/zone.js.ZoneDelegate.invoke (http://localhost:9876/_karma_webpack_/polyfills.bundle.js:2800:32)
  at Zone.webpackJsonp.../../../../zone.js/dist/zone.js.Zone.run (http://localhost:9876/_karma_webpack_/polyfills.bundle.js:2551:43)
```

To reproduce, simply install the dependencies via either Yarn or NPM—I've provided lock filed for both— and then run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).
