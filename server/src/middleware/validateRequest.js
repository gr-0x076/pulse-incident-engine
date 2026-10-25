const { ZodError } = require('zod');

const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data; // replace with parsed/coerced data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.flatten().fieldErrors,
          },
        });
      }
      next(error);
    }
  };
};

module.exports = validateRequest;
