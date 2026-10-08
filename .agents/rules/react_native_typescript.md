---
name: react_native_typescript
description: React Native and TypeScript styling conventions for Sprintflow
trigger: model_decision
---

# React Native & TypeScript Guidelines

1. **Absolute Fill**: When spreading fill styles inside `StyleSheet.create({...})`, always use `...StyleSheet.absoluteFillObject` rather than `...StyleSheet.absoluteFill` to prevent TypeScript TS2698 spread errors.
2. **Ambient Module Declarations**: Maintain `src/types/declarations.d.ts` for third-party libraries missing types in node_modules rather than adding `any` overrides in business components.
3. **Array Segments**: In Expo Router layouts, cast `segments as string[]` when accessing specific path segments by index to prevent tuple length indexing errors (TS2493).
