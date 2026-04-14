import { faker } from '@faker-js/faker';

export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export class DataHelper {
  static user(overrides: Partial<UserData> = {}): UserData {
    return {
      email: faker.internet.email(),
      password: 'TestPass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      ...overrides,
    };
  }

  static randomEmail(): string {
    return faker.internet.email();
  }

  static randomString(length = 8): string {
    return faker.string.alphanumeric(length);
  }

  static randomInt(min = 1, max = 100): number {
    return faker.number.int({ min, max });
  }
}
