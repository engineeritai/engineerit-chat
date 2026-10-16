/** Disciplines offered in the chat assistant. Keep this list in sync with the sidebar. */
export const DISCIPLINES = [
  "General",
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Instrumentation",
  "Process Engineering",
  "Geotechnical",
  "Mining Engineering",
  "Architectural",
  "Project Engineering",
  "Value Engineering",
  "Survey",
  "Exploration",
  "HSE / HAZOP",
] as const;

export type Discipline = (typeof DISCIPLINES)[number];
