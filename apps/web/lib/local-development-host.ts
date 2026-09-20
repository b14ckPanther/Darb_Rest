/** Only strict loopback/private IPv4 Host values may bypass tenant lookup in development. */
export function isLocalDevelopmentHost(rawHost: string): boolean {
  if (process.env.NODE_ENV === "production") return false;

  const match = /^(localhost|(?:\d{1,3}\.){3}\d{1,3})(?::(\d{1,5}))?$/i.exec(rawHost);
  if (!match || match[0] !== rawHost) return false;
  if (match[2] !== undefined && (Number(match[2]) < 1 || Number(match[2]) > 65535)) return false;
  const hostname = match[1]!.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;

  const parts = hostname.split(".");
  const octets = parts.map(Number);
  if (parts.some((part, index) => String(octets[index]) !== part || octets[index]! > 255))
    return false;
  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 172 && second! >= 16 && second! <= 31) ||
    (first === 192 && second === 168)
  );
}
