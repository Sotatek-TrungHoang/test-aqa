# Efficiency Review: UserFactory Refactor

## Summary
The refactor consolidates data generation into `UserFactory` and removes `DataHelper`. The three new thin wrapper methods (`randomEmail`, `randomString`, `randomInt`) add unnecessary indirection without providing value.

## Findings

### 1. Unnecessary Wrapper Methods
**Issue**: Lines 31-44 in `user.factory.ts` are direct pass-throughs to faker.js
```
randomEmail() → faker.internet.email()
randomString(length) → faker.string.alphanumeric(length)
randomInt(min, max) → faker.number.int({ min, max })
```

**Impact**: 
- Adds a layer of indirection with zero abstraction benefit
- Callers must import `UserFactory` just to call `faker` methods
- No validation, transformation, or domain logic added
- Increases cognitive load (where should I call faker from?)

### 2. Usage Pattern
Only `UserFactory.create()` is actively used in the codebase (1 usage found). The three wrapper methods have **zero usage**, making them dead code.

### 3. Performance Concerns
- **Minimal**: No computational overhead (direct method calls)
- **Import overhead**: Negligible (faker already imported for `create()`)
- **Memory**: No additional memory cost

## Recommendations

**Remove the three wrapper methods** (lines 31-44). Callers should:
- Import faker directly for utility methods: `import { faker } from '@faker-js/faker'`
- Use `UserFactory` only for domain-specific factories (`create`, `createAdmin`, `createBatch`)

This follows the Single Responsibility Principle: `UserFactory` creates users, not random data.

## Unresolved Questions
- Are these methods planned for future use, or can they be removed immediately?
