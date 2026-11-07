// ATPL(A) subject manifest. Only reviewed/implemented modules can be enabled.
export const modules = [
  ["010", "Air Law"],
  ["021", "Aircraft General Knowledge — Airframe, Systems and Power Plant"],
  ["022", "Aircraft General Knowledge — Instrumentation"],
  ["031", "Mass and Balance"],
  ["032", "Performance"],
  ["033", "Flight Planning and Monitoring"],
  ["040", "Human Performance"],
  ["050", "Meteorology"],
  ["061", "General Navigation"],
  ["062", "Radio Navigation"],
  ["070", "Operational Procedures"],
  ["081", "Principles of Flight"],
  ["090", "Communications"],
].map(([id, title]) => ({
  id,
  title,
  enabled: id === "010",
  contentUrl: id === "010" ? "content/010-air-law.json" : null,
}));
