export class UnknownCountryError extends Error {
  constructor(readonly iocCode: string) {
    super(`Unknown country code: ${iocCode}`);
    this.name = 'UnknownCountryError';
  }
}

export class PlayerAlreadyExistsError extends Error {
  constructor(
    readonly firstname: string,
    readonly lastname: string,
  ) {
    super(`Player already exists: ${firstname} ${lastname}`);
    this.name = 'PlayerAlreadyExistsError';
  }
}
