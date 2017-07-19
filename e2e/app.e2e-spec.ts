import { Zone845Page } from './app.po';

describe('zone845 App', () => {
  let page: Zone845Page;

  beforeEach(() => {
    page = new Zone845Page();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
