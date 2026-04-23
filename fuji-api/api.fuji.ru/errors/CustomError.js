export default class CustomError extends Error {
  constructor(data) {
    super(data.message);
    this.name = 'CustomError';
    this.data = data;
  }
}
