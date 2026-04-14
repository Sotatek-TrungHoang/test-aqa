import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Dashboard' });
  }
  get userMenu() {
    return this.page.locator('[data-testid="user-menu"]');
  }
  get logoutButton() {
    return this.page.locator('[data-testid="logout"]');
  }

  async navigate(): Promise<void> {
    await this.goto('/dashboard');
  }

  async isLoaded(): Promise<boolean> {
    return this.heading.isVisible();
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.logoutButton.click();
    await this.assertUrl('/login');
  }
}
