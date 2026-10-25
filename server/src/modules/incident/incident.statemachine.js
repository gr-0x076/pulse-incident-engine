const {
  INCIDENT_STATUS,
  VALID_TRANSITIONS,
  TRANSITION_GUARDS,
  ROLES,
} = require('../../config/constants');

/**
 * Pure state machine evaluator for Incident transitions.
 */
class IncidentStateMachine {
  /**
   * Get valid target transitions for a given status
   */
  getAvailableTransitions(currentStatus) {
    return VALID_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Evaluates if a transition from currentStatus to targetStatus is allowed,
   * checking syntax, role permissions, and required data guards.
   */
  validateTransition({
    currentStatus,
    targetStatus,
    userRole,
    payload = {},
    hasPostmortem = false,
  }) {
    // 1. Structural transition check
    const allowed = this.getAvailableTransitions(currentStatus);
    if (!allowed.includes(targetStatus)) {
      return {
        isValid: false,
        errorCode: 'INCIDENT_INVALID_TRANSITION',
        message: `Cannot transition incident from [${currentStatus}] to [${targetStatus}].`,
        details: {
          currentStatus,
          targetStatus,
          allowedTransitions: allowed,
        },
      };
    }

    const guard = TRANSITION_GUARDS[targetStatus];
    if (!guard) {
      return { isValid: true };
    }

    // 2. Role permission check
    if (guard.requiredRoles && !guard.requiredRoles.includes(userRole)) {
      return {
        isValid: false,
        errorCode: 'AUTHZ_INSUFFICIENT_ROLE',
        message: `Role [${userRole}] is not permitted to perform transition to [${targetStatus}].`,
        details: {
          userRole,
          requiredRoles: guard.requiredRoles,
        },
      };
    }

    // 3. Required data fields check
    if (guard.requiredFields && guard.requiredFields.length > 0) {
      const missingFields = [];
      for (const field of guard.requiredFields) {
        const val = payload[field];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim().length === 0)) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        return {
          isValid: false,
          errorCode: 'INCIDENT_MISSING_GUARD_DATA',
          message: `Transition to [${targetStatus}] requires missing data: ${missingFields.join(', ')}`,
          details: {
            targetStatus,
            missingFields,
          },
        };
      }
    }

    // 4. Specific domain guard validations
    if (targetStatus === INCIDENT_STATUS.MITIGATED) {
      if (!payload.mitigationSummary || payload.mitigationSummary.trim().length < 15) {
        return {
          isValid: false,
          errorCode: 'INCIDENT_MISSING_GUARD_DATA',
          message: 'Mitigation summary must be at least 15 characters describing tactical containment.',
        };
      }
    }

    if (targetStatus === INCIDENT_STATUS.RESOLVED) {
      if (!payload.rootCauseCategory || !payload.rootCauseDescription || payload.rootCauseDescription.trim().length < 15) {
        return {
          isValid: false,
          errorCode: 'INCIDENT_MISSING_GUARD_DATA',
          message: 'Resolution requires root cause category and description (min 15 characters).',
        };
      }
    }

    if (targetStatus === INCIDENT_STATUS.CLOSED) {
      if (guard.requiresPostmortem && !hasPostmortem) {
        return {
          isValid: false,
          errorCode: 'POSTMORTEM_REQUIRED_FOR_CLOSE',
          message: 'Cannot close incident without an attached published postmortem report.',
        };
      }
    }

    return { isValid: true };
  }
}

module.exports = new IncidentStateMachine();
