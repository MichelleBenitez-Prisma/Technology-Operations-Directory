import { expect, test } from "@playwright/test";

test("dashboard loads with primary visual landmarks", async ({ page }) => {
  await page.goto("/");
  const primaryNav = page.getByRole("navigation", { name: "Primary" });

  await expect(page.getByRole("heading", { name: "Technology Operations Directory" })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "Systems" })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "Vendors" })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "Reports" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add System" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open user guide" })).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeVisible();

  await expect(page.locator(".notice.error")).toHaveCount(0);
});

test("user guide opens from the dashboard help button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open user guide" }).click();

  await expect(page).toHaveURL(/#\/help$/);
  await expect(page.getByRole("heading", { name: "User Guide" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Systems" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reports And Data Quality" })).toBeVisible();
});
