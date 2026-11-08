export class UnknownCountryError extends Error {
  constructor(readonly iocCode: string) {
    super(`Unknown country code: ${iocCode}`);
    this.name = 'UnknownCountryError';
  }
}
