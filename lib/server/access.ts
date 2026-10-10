import { timingSafeEqual } from 'node:crypto';
export function ownerEnabled() {
  return (
    process.env.EVENTSIGNAL_BUILD_OWNER === 'yes' &&
    process.env.EVENTSIGNAL_MODE === 'owner'
  );
}
export function authorize(request: Request): boolean {
  if (!ownerEnabled()) return false;
  const token = process.env.EVENTSIGNAL_OWNER_TOKEN ?? '';
  const supplied =
    request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (
    token.length < 32 ||
    Buffer.byteLength(token) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(supplied))
  )
    return false;
  const internal = new URL(request.url);
  const url = new URL(
    `${internal.protocol}//${request.headers.get('host') ?? internal.host}`,
  );
  const origin = request.headers.get('origin');
  return (
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    (!origin || origin === url.origin)
  );
}
