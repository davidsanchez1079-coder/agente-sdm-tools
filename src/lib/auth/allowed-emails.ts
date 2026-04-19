const allowedEmails = [
  "david.sanchez@stamadeus.com",
  "david.sanchez@sadama.com.mx",
] as const;

export function isAllowedEmail(email: string) {
  return allowedEmails.includes(email.trim().toLowerCase() as (typeof allowedEmails)[number]);
}

export function getAllowedEmails() {
  return [...allowedEmails];
}
