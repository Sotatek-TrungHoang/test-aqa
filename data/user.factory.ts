import { faker } from '@faker-js/faker';

export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isAdmin?: boolean;
}

export class UserFactory {
  static create(overrides: Partial<UserData> = {}): UserData {
    return {
      email: faker.internet.email(),
      password: 'TestPass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      isAdmin: false,
      ...overrides,
    };
  }

  static createAdmin(overrides: Partial<UserData> = {}): UserData {
    return this.create({ isAdmin: true, ...overrides });
  }

  static createBatch(count: number, overrides: Partial<UserData> = {}): UserData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
