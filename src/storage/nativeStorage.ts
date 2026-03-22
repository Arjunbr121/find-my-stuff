/**
 * TypeScript / fallback resolution for `./nativeStorage`.
 * Metro still prefers `nativeStorage.web.ts` and `nativeStorage.native.ts` at bundle time.
 */
export { NativeStorage } from './nativeStorage.native';
