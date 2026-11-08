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

export class PlayerNotFoundError extends Error {
  constructor(readonly playerId: number) {
    super(`Player not found: ${String(playerId)}`);
    this.name = 'PlayerNotFoundError';
  }
}
