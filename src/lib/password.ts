// The brief's rule: more than 8 characters, with an uppercase letter, a
// lowercase letter and a special character. Checked in the form and again on
// the server.
export const passwordRules = [
  { label: "More than 8 characters", test: (p: string) => p.length > 8 },
  { label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "A special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const passwordPattern = "(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}";

export const passwordHint =
  "More than 8 characters, with an uppercase letter, a lowercase letter and a special character.";

export function passwordProblem(password: string) {
  const missing = passwordRules.filter((r) => !r.test(password));
  return missing.length ? `Your password needs: ${missing.map((r) => r.label.toLowerCase()).join(", ")}.` : null;
}
