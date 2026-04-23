const getErrorMessage = (statusCode) => {
  const messages = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error',

  };

  return messages[statusCode] || 'Internal Server Error';
};
export const errorSchema = (statusCode, message) => ({
  type: 'object',
  properties: {
    statusCode: { type: 'integer', example: statusCode },
    error: { type: 'string', example: getErrorMessage(statusCode) },
    message: { type: 'string', example: message },
    data: { type: 'object', additionalProperties: true },

  },
  additionalProperties: true,
});

export const defaultError = {
  400: errorSchema(400, 'Ошибка валидации данных'),
  401: errorSchema(401, 'Доступ запрещен'),
  500: errorSchema(500, 'Что-то пошло не так!!!'),
};
