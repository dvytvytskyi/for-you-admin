export class Conversions {
  static readonly USD_TO_AED = 3.67;
  static readonly SQM_TO_SQFT = 10.764;

  static usdToAed(usd: number): number {
    return Math.round(usd * this.USD_TO_AED);
  }

  static sqmToSqft(sqm: number): number {
    return Math.round(sqm * this.SQM_TO_SQFT);
  }
}

