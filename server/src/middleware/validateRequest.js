const { ZodError } = require('zod');

const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data; // replace with parsed/coerced data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.flatten().fieldErrors;
        const firstField = Object.keys(fieldErrors)[0];
        const firstMsg = firstField && fieldErrors[firstField]?.[0];
        const message = firstMsg ? `${firstField}: ${firstMsg}` : 'Request validation failed';

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message,
            details: fieldErrors,
          },
        });
      }
      next(error);
    }
  };
};

module.exports = validateRequest;
