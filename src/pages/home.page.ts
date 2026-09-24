import { expect, type Locator, type Page } from "@playwright/test";
import { ROUTES, TEST_IDS } from "../constants.js";

export class HomePage {
  readonly root: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId(TEST_IDS.homeRoot);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL((url) => new URL(url).pathname === ROUTES.home);
    const signedInHome = this.root.or(this.page.getByRole("heading", { name: "Find your next book" }));
    await expect(signedInHome).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Logout" })).toBeVisible();
  }
}
